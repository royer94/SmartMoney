import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useUser } from '../context/UserContext';
import {
  Transaction,
  UserProfile,
  Goal,
  TRIAL_TEXT_LIMIT,
  TRIAL_VOICE_LIMIT,
  FREE_TEXT_LIMIT,
  FREE_VOICE_LIMIT
} from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function hasActiveTrial(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.isPro === true || user.isActive === true) return false;
  if (user.trialEndDate) {
    const endDate = typeof user.trialEndDate.toDate === 'function'
      ? user.trialEndDate.toDate()
      : new Date(user.trialEndDate);
    if (!isNaN(endDate.getTime())) {
      return endDate > new Date();
    }
  }
  return user.isTrialActive === true;
}

function matchesGoalCategory(goal: Goal, txCategory?: string): boolean {
  if (!goal.category || goal.category === 'Todas') return true;
  return (goal.category || '').toLowerCase() === (txCategory || 'Otros').toLowerCase();
}

export function useFinance() {
  const { user, loading: userLoading } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const userId = user?.uid || null;
  const isAdmin = Boolean(user?.isAdmin);

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setGoals([]);
      setAllUsers([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let txLoaded = false;
    let goalsLoaded = false;
    const checkReady = () => {
      if (txLoaded && goalsLoaded) {
        setDataLoading(false);
      }
    };

    // Transactions subscription
    const pathTx = 'transactions';
    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data() as Transaction, id: d.id })));
      txLoaded = true;
      checkReady();
    }, (error) => {
      txLoaded = true;
      checkReady();
      handleFirestoreError(error, OperationType.GET, pathTx);
    });

    // Goals subscription
    const pathGoals = 'goals';
    const qGoals = query(
      collection(db, 'goals'),
      where('userId', '==', userId)
    );
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ ...d.data() as Goal, id: d.id })));
      goalsLoaded = true;
      checkReady();
    }, (error) => {
      goalsLoaded = true;
      checkReady();
      handleFirestoreError(error, OperationType.GET, pathGoals);
    });

    // Admin: Subscription to all users if user is admin
    let unsubAllUsers: () => void = () => {};
    if (isAdmin) {
      const qAllUsers = query(collection(db, 'users'));
      unsubAllUsers = onSnapshot(qAllUsers, (snap) => {
        setAllUsers(snap.docs.map(d => d.data() as UserProfile));
      });
    }

    return () => {
      unsubTransactions();
      unsubGoals();
      unsubAllUsers();
    };
  }, [userId, isAdmin]);

  // ✅ Función addTransaction con límites de Trial (30d: 30 texto / 10 voz) y Plan Free posterior (15 texto / 3 voz)
  const addTransaction = async (t: Omit<Transaction, 'id' | 'userId' | 'timestamp'>) => {
    const currentAuthId = auth.currentUser?.uid;
    if (!currentAuthId || !user) return;

    const isPaidPro = Boolean(user.isPro || user.isActive);
    const isTrial = !isPaidPro && hasActiveTrial(user);
    const mode = t.inputMode === 'voice' ? 'voice' : 'text';

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMonthTransactions = transactions.filter(tx => {
      const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
      return txDate >= firstDayOfMonth;
    });

    const textRecordsCount = currentMonthTransactions.filter(tx => (tx.inputMode || 'text') === 'text').length;
    const voiceRecordsCount = currentMonthTransactions.filter(tx => tx.inputMode === 'voice').length;

    // Validación de límites para usuarios en Trial (30 días) o Plan Free (día 31+)
    if (!isPaidPro) {
      const textLimit = isTrial ? TRIAL_TEXT_LIMIT : FREE_TEXT_LIMIT;
      const voiceLimit = isTrial ? TRIAL_VOICE_LIMIT : FREE_VOICE_LIMIT;
      const planName = isTrial ? 'período de prueba de 30 días' : 'plan gratuito';

      if (mode === 'text' && textRecordsCount >= textLimit) {
        throw new Error(`Has alcanzado el límite de ${textLimit} registros de texto en tu ${planName}. Pásate a Pro para registros ilimitados.`);
      }

      if (mode === 'voice' && voiceRecordsCount >= voiceLimit) {
        throw new Error(`Has alcanzado el límite de ${voiceLimit} registros de voz en tu ${planName}. Pásate a Pro para dictado por voz ilimitado.`);
      }
    }

    const pathTx = 'transactions';
    try {
      const { ...cleanT } = t as any;
      if (cleanT.id) delete cleanT.id;

      const newTransaction = {
        ...cleanT,
        inputMode: mode,
        userId: currentAuthId,
        timestamp: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, pathTx), newTransaction);
      let alerts: string[] = [];

      if (t.type === 'expense') {
        const txDate = new Date();
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();

        for (const goal of goals) {
          if (goal.month === txMonth && goal.year === txYear && matchesGoalCategory(goal, t.category)) {
            const newCurrent = (goal.currentAmount || 0) + Number(t.amount);
            const prevProgress = (goal.currentAmount || 0) / goal.targetAmount;
            const currProgress = newCurrent / goal.targetAmount;

            const goalRef = doc(db, 'goals', goal.id!);
            await updateDoc(goalRef, { currentAmount: newCurrent });

            if (prevProgress < 0.5 && currProgress >= 0.5) alerts.push(`⚠️ Has alcanzado el 50% de tu presupuesto: ${goal.name}`);
            if (prevProgress < 0.8 && currProgress >= 0.8) alerts.push(`🚨 Has alcanzado el 80% de tu presupuesto: ${goal.name}`);
            if (prevProgress < 1.0 && currProgress >= 1.0) alerts.push(`🛑 ¡Límite alcanzado!: ${goal.name}`);
          }
        }
      }
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        freeRecordsCount: (user.freeRecordsCount || 0) + 1,
        monthlyRecordCount: mode === 'text' ? textRecordsCount + 1 : textRecordsCount,
        monthlyVoiceCount: mode === 'voice' ? voiceRecordsCount + 1 : voiceRecordsCount,
        lastResetDate: now.toISOString(),
      });

      return { id: docRef.id, alerts };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, pathTx);
    }
  };

  // ✅ Editar una transacción existente y recalcular los presupuestos del mes si cambió monto, tipo o categoría
  const updateTransaction = async (
    id: string,
    updates: Partial<Pick<Transaction, 'description' | 'amount' | 'category' | 'type' | 'isRecurring'>>
  ) => {
    const pathTx = `transactions/${id}`;
    try {
      const prevTx = transactions.find(t => t.id === id);
      const cleanUpdates: Record<string, any> = {};
      if (updates.description !== undefined) cleanUpdates.description = updates.description.trim();
      if (updates.amount !== undefined) cleanUpdates.amount = Number(updates.amount);
      if (updates.category !== undefined) cleanUpdates.category = updates.category;
      if (updates.type !== undefined) cleanUpdates.type = updates.type;
      if (updates.isRecurring !== undefined) cleanUpdates.isRecurring = updates.isRecurring;

      await updateDoc(doc(db, 'transactions', id), cleanUpdates);

      if (prevTx && (updates.amount !== undefined || updates.type !== undefined || updates.category !== undefined)) {
        const txDate = prevTx.timestamp?.toDate ? prevTx.timestamp.toDate() : new Date(prevTx.timestamp);
        if (!isNaN(txDate.getTime())) {
          const txMonth = txDate.getMonth() + 1;
          const txYear = txDate.getFullYear();
          const newType = updates.type ?? prevTx.type;
          const newAmount = updates.amount !== undefined ? Number(updates.amount) : Number(prevTx.amount);
          const newCategory = updates.category ?? prevTx.category;

          for (const goal of goals) {
            if (goal.month === txMonth && goal.year === txYear && goal.id) {
              const oldContribution = (prevTx.type === 'expense' && matchesGoalCategory(goal, prevTx.category)) ? Number(prevTx.amount) : 0;
              const newContribution = (newType === 'expense' && matchesGoalCategory(goal, newCategory)) ? newAmount : 0;
              const diff = newContribution - oldContribution;
              if (diff !== 0) {
                const updatedCurrent = Math.max(0, (goal.currentAmount || 0) + diff);
                await updateDoc(doc(db, 'goals', goal.id), { currentAmount: updatedCurrent });
              }
            }
          }
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, pathTx);
    }
  };

  const removeTransaction = async (id: string) => {
    const pathTx = `transactions/${id}`;
    try {
      const tSnap = await getDoc(doc(db, 'transactions', id));
      if (tSnap.exists()) {
        const t = tSnap.data() as Transaction;
        if (t.type === 'expense') {
          const txDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
          const txMonth = txDate.getMonth() + 1;
          const txYear = txDate.getFullYear();

          for (const goal of goals) {
            if (goal.month === txMonth && goal.year === txYear && matchesGoalCategory(goal, t.category)) {
              const goalRef = doc(db, 'goals', goal.id!);
              await updateDoc(goalRef, { currentAmount: Math.max(0, (goal.currentAmount || 0) - Number(t.amount)) });
            }
          }
        }
      }
      await deleteDoc(doc(db, 'transactions', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, pathTx);
    }
  };

  const addGoal = async (g: Omit<Goal, 'id' | 'userId'>) => {
    if (!user) return;

    const hasProAccess = Boolean(user.isPro || user.isActive || hasActiveTrial(user));

    if (!hasProAccess && goals.length >= 1) {
      throw new Error("El plan gratuito solo permite establecer 1 presupuesto (meta). Actualiza a Pro para presupuestos ilimitados.");
    }

    const initialAmount = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!matchesGoalCategory(g as Goal, t.category)) return false;
        
        let tDate: Date;
        try {
          if (t.timestamp?.toDate) {
            tDate = t.timestamp.toDate();
          } else if (t.timestamp instanceof Date) {
            tDate = t.timestamp;
          } else if (t.timestamp?.seconds) {
            tDate = new Date(t.timestamp.seconds * 1000);
          } else {
            tDate = new Date(t.timestamp);
          }
          
          if (isNaN(tDate.getTime())) return false;
        } catch (e) {
          return false;
        }

        const tMonth = tDate.getMonth() + 1;
        const tYear = tDate.getFullYear();
        
        return tMonth === Number(g.month) && tYear === Number(g.year);
      })
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const path = 'goals';
    try {
      await addDoc(collection(db, path), { 
        ...g, 
        currentAmount: initialAmount,
        userId: user.uid 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const removeGoal = async (id: string) => {
    const path = `goals/${id}`;
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const updateGoal = async (id: string, amount: number) => {
    const path = `goals/${id}`;
    try {
      const goalRef = doc(db, 'goals', id);
      await updateDoc(goalRef, { currentAmount: amount });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const activatePro = async (targetUserId?: string, months: number = 1) => {
    const uid = targetUserId || user?.uid;
    if (!uid) return;
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);
      await updateDoc(userRef, { 
        isPro: true,
        isActive: true,
        isTrialActive: false,
        trialEndDate: null,
        proExpiresAt: expiry.toISOString() 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const deactivatePro = async (targetUserId: string) => {
    if (!user?.isAdmin) return;
    const path = `users/${targetUserId}`;
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 
        isPro: false,
        isActive: false,
        isTrialActive: false,
        trialEndDate: null,
        proExpiresAt: null 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const toggleRecurring = async (id: string, state: boolean) => {
    const path = `transactions/${id}`;
    try {
      await updateDoc(doc(db, 'transactions', id), { isRecurring: state });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const recalculateGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const amount = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!matchesGoalCategory(goal, t.category)) return false;
        let tDate: Date;
        try {
          if (t.timestamp?.toDate) tDate = t.timestamp.toDate();
          else if (t.timestamp instanceof Date) tDate = t.timestamp;
          else if (t.timestamp?.seconds) tDate = new Date(t.timestamp.seconds * 1000);
          else tDate = new Date(t.timestamp);
          if (isNaN(tDate.getTime())) return false;
        } catch (e) { return false; }

        const tMonth = tDate.getMonth() + 1;
        const tYear = tDate.getFullYear();
        return tMonth === goal.month && tYear === goal.year;
      })
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const goalRef = doc(db, 'goals', id);
    try {
      await updateDoc(goalRef, { currentAmount: amount });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `goals/${id}`);
    }
  };

  return { 
    user, 
    transactions, 
    goals, 
    loading: userLoading || dataLoading, 
    allUsers,
    addTransaction,
    updateTransaction,
    removeTransaction, 
    addGoal, 
    removeGoal,
    updateGoal,
    recalculateGoal,
    activatePro,
    deactivatePro,
    toggleRecurring
  };
}
