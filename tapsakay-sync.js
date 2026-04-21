(function () {
  const STORAGE_KEY = 'tapsakay-demo-state-v1';
  const listeners = new Set();

  const DEFAULT_STATE = {
    routes: {
      '13C': { waiting: 2, seats: 9, stop: 'JY Square' },
      '04B': { waiting: 1, seats: 6, stop: 'JY Square' },
      '04L': { waiting: 4, seats: 3, stop: 'JY Square' },
      '62B': { waiting: 0, seats: 11, stop: 'JY Square' }
    },
    commuter: {
      selectedKey: '13c-1',
      routeCode: '13C',
      routeLabel: '13C #1 → Colon',
      registered: false,
      status: 'idle',
      boardedAt: '',
      updatedAt: Date.now()
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeState(base, incoming) {
    const next = clone(base);
    if (!incoming || typeof incoming !== 'object') return next;

    if (incoming.routes && typeof incoming.routes === 'object') {
      Object.keys(next.routes).forEach((code) => {
        next.routes[code] = Object.assign({}, next.routes[code], incoming.routes[code] || {});
      });
      Object.keys(incoming.routes).forEach((code) => {
        if (!next.routes[code]) next.routes[code] = Object.assign({}, incoming.routes[code]);
      });
    }

    if (incoming.commuter && typeof incoming.commuter === 'object') {
      next.commuter = Object.assign({}, next.commuter, incoming.commuter);
    }

    return next;
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      return mergeState(DEFAULT_STATE, JSON.parse(raw));
    } catch (error) {
      return clone(DEFAULT_STATE);
    }
  }

  let state = readState();

  function emit() {
    listeners.forEach((listener) => listener(getState()));
  }

  function writeState(nextState) {
    state = mergeState(DEFAULT_STATE, nextState);
    state.commuter.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    emit();
  }

  function updateState(mutator) {
    const draft = clone(state);
    const result = mutator(draft) || draft;
    writeState(result);
    return getState();
  }

  function ensureRoute(code) {
    if (!state.routes[code]) {
      state.routes[code] = { waiting: 0, seats: 0, stop: 'JY Square' };
    }
  }

  function getState() {
    return clone(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function selectCommuterRoute(payload) {
    updateState((draft) => {
      draft.commuter.selectedKey = payload.key;
      draft.commuter.routeCode = payload.code;
      draft.commuter.routeLabel = payload.label;
    });
  }

  function registerCommuter(payload) {
    let result = null;
    updateState((draft) => {
      if (draft.commuter.registered && draft.commuter.status === 'waiting') {
        result = { registered: false, reason: 'already-waiting' };
        return draft;
      }

      if (!draft.routes[payload.code]) {
        draft.routes[payload.code] = { waiting: 0, seats: 0, stop: 'JY Square' };
      }

      draft.routes[payload.code].waiting += 1;
      draft.commuter = {
        selectedKey: payload.key,
        routeCode: payload.code,
        routeLabel: payload.label,
        registered: true,
        status: 'waiting',
        boardedAt: '',
        updatedAt: Date.now()
      };
      result = { registered: true, waiting: draft.routes[payload.code].waiting };
      return draft;
    });
    return result;
  }

  function boardRoute(routeCode, stopName) {
    let result = { boarded: 0, waitingRemaining: 0 };
    updateState((draft) => {
      if (stopName !== 'JY Square') return draft;
      if (!draft.routes[routeCode]) return draft;

      const route = draft.routes[routeCode];
      const capacity = Math.max(0, Number(route.seats) || 0);
      const waiting = Math.max(0, Number(route.waiting) || 0);
      const boarded = Math.min(waiting, capacity);

      route.waiting = Math.max(0, waiting - boarded);
      result = { boarded, waitingRemaining: route.waiting, capacity };

      if (
        boarded > 0 &&
        draft.commuter.registered &&
        draft.commuter.status === 'waiting' &&
        draft.commuter.routeCode === routeCode
      ) {
        draft.commuter.registered = false;
        draft.commuter.status = 'boarded';
        draft.commuter.boardedAt = stopName;
      }

      return draft;
    });
    return result;
  }

  function setRouteSeats(routeCode, seats) {
    updateState((draft) => {
      if (!draft.routes[routeCode]) {
        draft.routes[routeCode] = { waiting: 0, seats: 0, stop: 'JY Square' };
      }
      draft.routes[routeCode].seats = Math.max(0, Number(seats) || 0);
      return draft;
    });
  }

  function resetCommuterStatus() {
    updateState((draft) => {
      draft.commuter.registered = false;
      draft.commuter.status = 'idle';
      draft.commuter.boardedAt = '';
      return draft;
    });
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    state = readState();
    emit();
  });

  window.TapSakaySync = {
    getState,
    subscribe,
    selectCommuterRoute,
    registerCommuter,
    boardRoute,
    setRouteSeats,
    resetCommuterStatus
  };
})();
