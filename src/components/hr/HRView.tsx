import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { User, Shift, AttendanceRecord } from '../../types';
/** V1 RH: employee records, planning and manually-entered presence only. */
export const HRView: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]); const [shifts, setShifts] = useState<Shift[]>([]); const [presence, setPresence] = useState<AttendanceRecord[]>([]);
  const load = () => Promise.all([api.getEmployees(), api.getShifts(), api.getAttendances()]).then(([e,s,p]) => { setEmployees(e); setShifts(s); setPresence(p); });
  useEffect(() => { load(); }, []);
  return <main className="p-6 space-y-6"><h1 className="text-2xl font-bold">Équipe & présence</h1><p className="text-sm">Planification et présence saisies manuellement. Aucun pointage en temps réel ni traitement de paie.</p><section><h2 className="font-bold">Employés</h2><div className="grid gap-2">{employees.map(e => <div className="bg-white border rounded p-3" key={e.id}>{e.name} · {e.phone} · {e.active ? 'Actif' : 'Inactif'}</div>)}</div></section><section><h2 className="font-bold">Planning</h2>{shifts.map(s => <div key={s.id}>{s.date} — {s.employeeName}: {s.startTime}–{s.endTime}</div>)}</section><section><h2 className="font-bold">Présence manuelle</h2>{presence.map(p => <div key={p.id}>{p.date} — {p.employeeName}: {p.status}</div>)}</section></main>;
};
