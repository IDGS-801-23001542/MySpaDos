export const initialAuthState = { identity: null, loading: true };

// useReducer de PWA: transiciones de sesión centralizadas y previsibles.
export function authReducer(state, action) {
  switch (action.type) {
    case 'IDENTITY_LOADED':
    case 'AUTHENTICATED':
      return { identity: action.identity, loading: false };
    case 'LOGGED_OUT':
      return { identity: null, loading: false };
    default:
      return state;
  }
}
