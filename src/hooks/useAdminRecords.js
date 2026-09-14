import { useRef, useState } from 'react'
import { getJson } from '../services/api'
import { mutate, resources } from '../services/admin'

export default function useAdminRecords(tab, dashboard) {
  const [actionError, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const opening = useRef(false);
  const meta = resources.find(r => r.id === tab);
  const { cooldown, retryIn } = dashboard;
  const blocked = retryIn > 0;
  function refresh() {
    setError(null);
    dashboard.refresh();
  }
  function changed() {
    setNotice("Perubahan tersimpan.");
    setError(null);
    dashboard.changed();
  }

  async function openRecord(mode, record) {
    if (opening.current || blocked) return;
    opening.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await getJson("/api/" + tab + "/" + record[meta.key]);
      setDialog({ mode, resource: tab, record: response.data });
    } catch (failure) {
      setError(failure);
      cooldown(failure);
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (busy || blocked) return;
    setBusy(true);
    setError(null);
    try {
      await mutate(
        "/api/" +
        dialog.resource +
        "/" +
        dialog.record[resources.find((r) => r.id === dialog.resource).key],
        "DELETE"
      );
      setDialog(null);
      changed();
    } catch (failure) {
      setError(failure);
      cooldown(failure);
      setDialog(null);
      dashboard.changed();
    } finally {
      setBusy(false);
    }
  }

  return { error: actionError || dashboard.error, notice, setNotice, dialog, setDialog, busy, blocked, cooldown, refresh, changed, openRecord, remove };
}
