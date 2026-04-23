import { useEffect, useState } from 'react';
import { useStore } from '../store';

export function AuthorizeModal() {
  const { authOpen, closeAuth, token, setToken } = useStore();
  const [draft, setDraft] = useState(token);

  useEffect(() => {
    if (authOpen) setDraft(token);
  }, [authOpen, token]);

  if (!authOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuth();
      }}
    >
      <div className="modal" role="dialog" aria-labelledby="auth-title">
        <div className="modal-head">
          <h3 className="modal-title" id="auth-title">Authorize</h3>
          <p className="modal-sub">Bearer token is attached to every authenticated request.</p>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label" htmlFor="token-input">Access Token</label>
            <input
              id="token-input"
              className="input"
              placeholder="eyJhbGciOi…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-foot">
          <button
            className="btn-light"
            onClick={() => {
              setToken('');
              closeAuth();
            }}
          >
            Clear
          </button>
          <button
            className="btn-light primary"
            onClick={() => {
              setToken(draft.trim());
              closeAuth();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
