// src/lib/onesignal.ts

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_URL ||
  'https://us-central1-gen-lang-client-0987361888.cloudfunctions.net';

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
  }
}

function runWithOneSignal<T>(fn: (OneSignal: any) => Promise<T> | T, fallback: T): Promise<T> {
  if (typeof window === 'undefined') return Promise.resolve(fallback);

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    const timer = window.setTimeout(() => resolve(fallback), 5000);

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        const result = await fn(OneSignal);
        window.clearTimeout(timer);
        resolve(result);
      } catch (err) {
        console.error('[OneSignal] Error en operación SDK:', err);
        window.clearTimeout(timer);
        resolve(fallback);
      }
    });
  });
}

export async function loginOneSignal(uid: string, tags?: Record<string, string>): Promise<void> {
  await runWithOneSignal(async (OneSignal) => {
    await OneSignal.login(uid);
    if (tags && Object.keys(tags).length > 0 && OneSignal.User?.addTags) {
      OneSignal.User.addTags(tags);
    }
  }, undefined);
}

export async function logoutOneSignal(): Promise<void> {
  await runWithOneSignal(async (OneSignal) => {
    if (typeof OneSignal.logout === 'function') {
      await OneSignal.logout();
    }
  }, undefined);
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  optedIn: boolean;
}

export async function getOneSignalPushStatus(): Promise<PushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported', optedIn: false };
  }

  return runWithOneSignal(
    async (OneSignal) => {
      const supported =
        typeof OneSignal.Notifications?.isPushSupported === 'function'
          ? Boolean(OneSignal.Notifications.isPushSupported())
          : 'PushManager' in window;
      const permission = Notification.permission;
      const optedIn = Boolean(OneSignal.User?.PushSubscription?.optedIn);
      return { supported, permission, optedIn };
    },
    {
      supported: 'PushManager' in window,
      permission: Notification.permission,
      optedIn: false,
    }
  );
}

export async function requestOneSignalPermission(): Promise<PushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported', optedIn: false };
  }

  return runWithOneSignal<PushStatus>(
    async (OneSignal) => {
      if (typeof OneSignal.Notifications?.requestPermission === 'function') {
        await OneSignal.Notifications.requestPermission();
      } else if (typeof Notification.requestPermission === 'function') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted' && OneSignal.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      }

      return {
        supported: true,
        permission: Notification.permission,
        optedIn: Boolean(OneSignal.User?.PushSubscription?.optedIn),
      };
    },
    {
      supported: 'PushManager' in window,
      permission: Notification.permission,
      optedIn: false,
    }
  );
}

export async function setOneSignalOptIn(enabled: boolean): Promise<boolean> {
  return runWithOneSignal<boolean>(async (OneSignal) => {
    if (enabled) {
      if (Notification.permission !== 'granted' && OneSignal.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission();
      }
      if (Notification.permission === 'granted' && OneSignal.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      }
    } else if (OneSignal.User?.PushSubscription?.optOut) {
      await OneSignal.User.PushSubscription.optOut();
    }
    return Boolean(OneSignal.User?.PushSubscription?.optedIn);
  }, false);
}

export async function sendTestPushNotification(idToken: string): Promise<{ ok: boolean; id?: string }> {
  const response = await fetch(`${FUNCTIONS_BASE_URL}/sendTestPush`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo enviar la notificación de prueba.');
  }
  return data;
}
