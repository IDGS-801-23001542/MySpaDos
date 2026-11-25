export const initialAttendanceState = {
  due: [], dismissed: [], saving: false, error: '',
};

// El reducer gestiona la cola de avisos de asistencia, sin estados dispersos.
export function attendanceReducer(state, action) {
  switch (action.type) {
    case 'SYNC':
      return { ...state, due: action.due, error: '' };
    case 'DISMISS':
      return { ...state, dismissed: [...state.dismissed, action.id], error: '' };
    case 'START':
      return { ...state, saving: true, error: '' };
    case 'DONE':
      return { ...state, saving: false, error: '',
        due: state.due.filter((item) => item.id !== action.id),
        dismissed: [...state.dismissed, action.id] };
    case 'ERROR':
      return { ...state, saving: false, error: action.message };
    case 'CLEAR':
      return initialAttendanceState;
    default:
      return state;
  }
}
