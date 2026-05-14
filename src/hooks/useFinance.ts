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
  setDoc,
  Timestamp,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Transaction, UserProfile, Goal, FREE_LIMIT } from '../types';

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

export function useFinance() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((firebaseUser) => {
      setAuthUser(firebaseUser);
      if (!firebaseUser) {
        setUser(null);
        setTransactions([]);
        setGoals([]);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    const userId = authUser.uid;
    const pathUser = `users/${userId}`;
    
    setLoading(true);

    // Check if user is admin
    const checkAdmin = async () => {
      const adminDoc = await getDoc(doc(db, 'admins', userId));
      return adminDoc.exists();
    };

    // User profile subscription
    const unsubUser = onSnapshot(doc(db, 'users', userId), async (snapshot: any) => {
      try {
        const isSystemAdmin = await checkAdmin();
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log(`[useFinance] User profile loaded for ${userId}`);
          setUser({ ...data, isAdmin: isSystemAdmin } as UserProfile);
        } else {
          // Create user if not exists
          console.log(`[useFinance] Creating new user profile for ${userId}`);
          const newData = {
            uid: userId,
            email: authUser.email || '',
            isPro: false,
            freeRecordsCount: 0
          };
          // Explicitly use setDoc and await it
          try {
            await setDoc(doc(db, 'users', userId), newData);
            console.log(`[useFinance] User profile created successfully for ${userId}`);
            setUser({ ...newData, isAdmin: isSystemAdmin } as UserProfile);
          } catch (createError: any) {
            console.error("[useFinance] Failed to create user profile in Firestore:", createError);
            alert("Error al crear tu perfil: " + createError.message);
            throw createError;
          }
        }
      } catch (error) {
        console.error("[useFinance] Error in user profile handler:", error);
        handleFirestoreError(error, OperationType.GET, pathUser);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("[useFinance] onSnapshot subscription error:", error);
      handleFirestoreError(error, OperationType.GET, pathUser);
      setLoading(false);
    });

    // Transactions subscription
    const pathTx = 'transactions';
    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ ...doc.data() as Transaction, id: doc.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathTx);
    });

    // Goals subscription
    const pathGoals = 'goals';
    const qGoals = query(
      collection(db, 'goals'),
      where('userId', '==', userId)
    );
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ ...doc.data() as Goal, id: doc.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, pathGoals);
    });

    // Admin: Subscription to all users if user is admin
    let unsubAllUsers: () => void = () => {};
    checkAdmin().then(isSystemAdmin => {
      if (isSystemAdmin) {
        const qAllUsers = query(collection(db, 'users'));
        unsubAllUsers = onSnapshot(qAllUsers, (snap) => {
          setAllUsers(snap.docs.map(d => d.data() as UserProfile));
        });
      }
    });

    return () => {
      unsubUser();
      unsubTransactions();
      unsubGoals();
      unsubAllUsers();
    };
  }, [authUser?.uid]);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'userId' | 'timestamp'>) => {
    const currentAuthId = auth.currentUser?.uid;
    if (!currentAuthId || !user) return;
    
    // Monthly record count (for Free Plan)
    if (!user.isPro) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRecords = transactions.filter(tx => {
        const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
        return txDate >= firstDayOfMonth;
      }).length;

      if (monthlyRecords >= FREE_LIMIT) {
        throw new Error(`Has alcanzado el límite de ${FREE_LIMIT} registros mensuales en el plan gratuito. Pásate a Pro para registros ilimitados.`);
      }
    }

    const pathTx = 'transactions';
    try {
      // Clean transaction object to ensure no extra fields (like 'id') are sent to addDoc
      const { ...cleanT } = t as any;
      if (cleanT.id) delete cleanT.id;

      const newTransaction = {
        ...cleanT,
        userId: currentAuthId,
        timestamp: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, pathTx), newTransaction);
      
      let alerts: string[] = [];

      // If it's an expense, update matching budgets (Goals) for the same month/year
      if (t.type === 'expense') {
        const txDate = new Date(); // Current date for new transactions
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();

        for (const goal of goals) {
          if (goal.month === txMonth && goal.year === txYear) {
            const newCurrent = (goal.currentAmount || 0) + Number(t.amount);
            const prevProgress = (goal.currentAmount || 0) / goal.targetAmount;
            const currProgress = newCurrent / goal.targetAmount;

            const pathGoal = `goals/${goal.id}`;
            const goalRef = doc(db, 'goals', goal.id!);
            await updateDoc(goalRef, { currentAmount: newCurrent });

            // Threshold Check
            if (prevProgress < 0.5 && currProgress >= 0.5) alerts.push(`⚠️ Has alcanzado el 50% de tu presupuesto: ${goal.name}`);
            if (prevProgress < 0.8 && currProgress >= 0.8) alerts.push(`🚨 Has alcanzado el 80% de tu presupuesto: ${goal.name}`);
            if (prevProgress < 1.0 && currProgress >= 1.0) alerts.push(`🛑 ¡Límite alcanzado!: ${goal.name}`);
          }
        }
      }
      
      const pathUser = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { freeRecordsCount: user.freeRecordsCount + 1 });

      return { id: docRef.id, alerts };
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, pathTx);
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
            if (goal.month === txMonth && goal.year === txYear) {
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

    if (!user.isPro && goals.length >= 1) {
      throw new Error("El plan gratuito solo permite establecer 1 presupuesto (meta). Actualiza a Pro para presupuestos ilimitados.");
    }

    // Calculate initial currentAmount based on existing transactions for the period
    const initialAmount = transactions
      .filter(t => {
        if (t.type !== 'expense') return false;
        
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
    loading, 
    allUsers,
    addTransaction, 
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

