const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

function nurseIdFromReq(req) {
  return req.user.nurseId || null;
}

// List handoffs (nurses see own sent/received; admin sees all)
router.get('/', verifyToken, checkRole(['admin', 'nurse', 'doctor']), (req, res) => {
  const { status, shift_date, direction } = req.query;
  const role = req.user.role;
  const myNurseId = nurseIdFromReq(req);

  let query = `
    SELECT h.*,
      fu.full_name as from_nurse_name,
      tu.full_name as to_nurse_name,
      au.full_name as acknowledged_by_name
    FROM shift_handoffs h
    JOIN nurses fn ON h.from_nurse_id = fn.id
    JOIN users fu ON fn.user_id = fu.id
    LEFT JOIN nurses tn ON h.to_nurse_id = tn.id
    LEFT JOIN users tu ON tn.user_id = tu.id
    LEFT JOIN users au ON h.acknowledged_by = au.id
  `;
  const conditions = [];
  const params = [];

  if (role === 'nurse' && myNurseId) {
    if (direction === 'sent') {
      conditions.push('h.from_nurse_id = ?');
      params.push(myNurseId);
    } else if (direction === 'received') {
      conditions.push('(h.to_nurse_id = ? OR (h.to_nurse_id IS NULL AND h.status = ?))');
      params.push(myNurseId, 'submitted');
    } else {
      conditions.push('(h.from_nurse_id = ? OR h.to_nurse_id = ? OR (h.to_nurse_id IS NULL AND h.status = ? AND h.from_nurse_id != ?))');
      params.push(myNurseId, myNurseId, 'submitted', myNurseId);
    }
  }

  if (status) {
    conditions.push('h.status = ?');
    params.push(status);
  }
  if (shift_date) {
    conditions.push('h.shift_date = ?');
    params.push(shift_date);
  }

  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY h.shift_date DESC, h.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Pending handoffs for incoming nurse (submitted, not yet acknowledged, targeted or open)
router.get('/pending', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const myNurseId = nurseIdFromReq(req);
  let query = `
    SELECT h.*,
      fu.full_name as from_nurse_name,
      tu.full_name as to_nurse_name
    FROM shift_handoffs h
    JOIN nurses fn ON h.from_nurse_id = fn.id
    JOIN users fu ON fn.user_id = fu.id
    LEFT JOIN nurses tn ON h.to_nurse_id = tn.id
    LEFT JOIN users tu ON tn.user_id = tu.id
    WHERE h.status = 'submitted'
  `;
  const params = [];

  if (req.user.role === 'nurse' && myNurseId) {
    query += ' AND (h.to_nurse_id = ? OR h.to_nurse_id IS NULL) AND h.from_nurse_id != ?';
    params.push(myNurseId, myNurseId);
  }

  query += ' ORDER BY h.submitted_at ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Floor snapshot for outgoing nurse — today's sessions for form prefill
router.get('/floor-snapshot', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const myNurseId = nurseIdFromReq(req);

  let sessionQuery = `
    SELECT ds.*, u.full_name as patient_name
    FROM dialysis_sessions ds
    JOIN patients p ON ds.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE ds.scheduled_date = ?
  `;
  const params = [today];

  if (req.user.role === 'nurse' && myNurseId) {
    sessionQuery += ' AND (ds.nurse_id = ? OR ds.nurse_id IS NULL)';
    params.push(myNurseId);
  }

  sessionQuery += ' ORDER BY ds.scheduled_time';

  db.all(sessionQuery, params, (err, sessions) => {
    if (err) return res.status(500).json({ error: err.message });

    const inProgress = (sessions || []).filter((s) => s.status === 'in_progress');
    const completed = (sessions || []).filter((s) => s.status === 'completed');
    const scheduled = (sessions || []).filter((s) => s.status === 'scheduled');
    const withComplications = (sessions || []).filter((s) => s.complications);

    res.json({
      date: today,
      sessions: sessions || [],
      summary: {
        total: (sessions || []).length,
        in_progress: inProgress.length,
        completed: completed.length,
        scheduled: scheduled.length,
        with_complications: withComplications.length
      },
      in_progress: inProgress,
      completed,
      scheduled,
      with_complications: withComplications
    });
  });
});

// Get single handoff with patient SBAR items
router.get('/:id', verifyToken, checkRole(['admin', 'nurse', 'doctor']), (req, res) => {
  db.get(
    `SELECT h.*,
      fu.full_name as from_nurse_name,
      tu.full_name as to_nurse_name,
      au.full_name as acknowledged_by_name
    FROM shift_handoffs h
    JOIN nurses fn ON h.from_nurse_id = fn.id
    JOIN users fu ON fn.user_id = fu.id
    LEFT JOIN nurses tn ON h.to_nurse_id = tn.id
    LEFT JOIN users tu ON tn.user_id = tu.id
    LEFT JOIN users au ON h.acknowledged_by = au.id
    WHERE h.id = ?`,
    [req.params.id],
    (err, handoff) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!handoff) return res.status(404).json({ error: 'Handoff not found' });

      db.all(
        `SELECT hp.*, u.full_name as patient_name
         FROM shift_handoff_patients hp
         JOIN patients p ON hp.patient_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE hp.handoff_id = ?
         ORDER BY
           CASE hp.acuity WHEN 'critical' THEN 0 WHEN 'watch' THEN 1 ELSE 2 END,
           u.full_name`,
        [req.params.id],
        (pErr, patients) => {
          if (pErr) return res.status(500).json({ error: pErr.message });
          res.json({ ...handoff, patients: patients || [] });
        }
      );
    }
  );
});

// Create handoff (draft or submitted)
router.post('/', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const fromNurseId = req.user.role === 'nurse' ? nurseIdFromReq(req) : (req.body.from_nurse_id || nurseIdFromReq(req));
  if (!fromNurseId) {
    return res.status(400).json({ error: 'Nurse profile required to create a handoff' });
  }

  const {
    to_nurse_id,
    shift_date,
    shift_type,
    status,
    unit_summary,
    patients_in_progress,
    completed_sessions_notes,
    complications_alerts,
    access_concerns,
    pending_tasks,
    medications_notes,
    equipment_notes,
    recommendations,
    census_count,
    patients
  } = req.body;

  if (!shift_date || !shift_type) {
    return res.status(400).json({ error: 'Shift date and shift type are required' });
  }

  const validTypes = ['morning', 'afternoon', 'night', 'other'];
  if (!validTypes.includes(shift_type)) {
    return res.status(400).json({ error: 'Invalid shift type' });
  }

  const handoffStatus = status === 'submitted' ? 'submitted' : 'draft';
  const submittedAt = handoffStatus === 'submitted' ? new Date().toISOString() : null;

  db.run(
    `INSERT INTO shift_handoffs (
      from_nurse_id, to_nurse_id, shift_date, shift_type, status,
      unit_summary, patients_in_progress, completed_sessions_notes,
      complications_alerts, access_concerns, pending_tasks,
      medications_notes, equipment_notes, recommendations, census_count, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fromNurseId,
      to_nurse_id || null,
      shift_date,
      shift_type,
      handoffStatus,
      unit_summary || null,
      patients_in_progress || null,
      completed_sessions_notes || null,
      complications_alerts || null,
      access_concerns || null,
      pending_tasks || null,
      medications_notes || null,
      equipment_notes || null,
      recommendations || null,
      census_count != null ? Number(census_count) : null,
      submittedAt
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const handoffId = this.lastID;

      const patientList = Array.isArray(patients) ? patients : [];
      const insertPatient = (idx) => {
        if (idx >= patientList.length) {
          notifyIncoming(handoffId, to_nurse_id, handoffStatus, fromNurseId);
          return res.status(201).json({ message: 'Handoff created', handoffId });
        }
        const item = patientList[idx];
        if (!item.patient_id) return insertPatient(idx + 1);
        db.run(
          `INSERT INTO shift_handoff_patients
            (handoff_id, patient_id, session_id, acuity, situation, background, assessment, recommendation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            handoffId,
            item.patient_id,
            item.session_id || null,
            ['stable', 'watch', 'critical'].includes(item.acuity) ? item.acuity : 'stable',
            item.situation || null,
            item.background || null,
            item.assessment || null,
            item.recommendation || null
          ],
          () => insertPatient(idx + 1)
        );
      };
      insertPatient(0);
    }
  );
});

function notifyIncoming(handoffId, toNurseId, status, fromNurseId) {
  if (status !== 'submitted') return;

  const title = 'Shift handoff ready';
  const message = `A shift handoff (#${handoffId}) has been submitted and needs acknowledgment.`;

  if (toNurseId) {
    db.get('SELECT user_id FROM nurses WHERE id = ?', [toNurseId], (err, row) => {
      if (!err && row) {
        db.run(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [row.user_id, title, message, 'alert']
        );
      }
    });
  } else {
    // Notify other nurses on the unit
    db.all(
      'SELECT user_id FROM nurses WHERE id != ?',
      [fromNurseId],
      (err, rows) => {
        if (err || !rows) return;
        rows.forEach((r) => {
          db.run(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [r.user_id, title, message, 'info']
          );
        });
      }
    );
  }
}

// Update draft handoff
router.put('/:id', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  db.get('SELECT * FROM shift_handoffs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Handoff not found' });

    if (row.status === 'acknowledged') {
      return res.status(400).json({ error: 'Acknowledged handoffs cannot be edited' });
    }

    if (req.user.role === 'nurse' && nurseIdFromReq(req) !== row.from_nurse_id) {
      return res.status(403).json({ error: 'Only the authoring nurse can edit this handoff' });
    }

    const {
      to_nurse_id,
      shift_date,
      shift_type,
      unit_summary,
      patients_in_progress,
      completed_sessions_notes,
      complications_alerts,
      access_concerns,
      pending_tasks,
      medications_notes,
      equipment_notes,
      recommendations,
      census_count,
      patients
    } = req.body;

    db.run(
      `UPDATE shift_handoffs SET
        to_nurse_id = COALESCE(?, to_nurse_id),
        shift_date = COALESCE(?, shift_date),
        shift_type = COALESCE(?, shift_type),
        unit_summary = COALESCE(?, unit_summary),
        patients_in_progress = COALESCE(?, patients_in_progress),
        completed_sessions_notes = COALESCE(?, completed_sessions_notes),
        complications_alerts = COALESCE(?, complications_alerts),
        access_concerns = COALESCE(?, access_concerns),
        pending_tasks = COALESCE(?, pending_tasks),
        medications_notes = COALESCE(?, medications_notes),
        equipment_notes = COALESCE(?, equipment_notes),
        recommendations = COALESCE(?, recommendations),
        census_count = COALESCE(?, census_count),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        to_nurse_id !== undefined ? to_nurse_id : null,
        shift_date || null,
        shift_type || null,
        unit_summary !== undefined ? unit_summary : null,
        patients_in_progress !== undefined ? patients_in_progress : null,
        completed_sessions_notes !== undefined ? completed_sessions_notes : null,
        complications_alerts !== undefined ? complications_alerts : null,
        access_concerns !== undefined ? access_concerns : null,
        pending_tasks !== undefined ? pending_tasks : null,
        medications_notes !== undefined ? medications_notes : null,
        equipment_notes !== undefined ? equipment_notes : null,
        recommendations !== undefined ? recommendations : null,
        census_count !== undefined && census_count !== null ? Number(census_count) : null,
        req.params.id
      ],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });

        if (Array.isArray(patients)) {
          db.run('DELETE FROM shift_handoff_patients WHERE handoff_id = ?', [req.params.id], () => {
            patients.forEach((item) => {
              if (!item.patient_id) return;
              db.run(
                `INSERT INTO shift_handoff_patients
                  (handoff_id, patient_id, session_id, acuity, situation, background, assessment, recommendation)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  req.params.id,
                  item.patient_id,
                  item.session_id || null,
                  ['stable', 'watch', 'critical'].includes(item.acuity) ? item.acuity : 'stable',
                  item.situation || null,
                  item.background || null,
                  item.assessment || null,
                  item.recommendation || null
                ]
              );
            });
          });
        }

        res.json({ message: 'Handoff updated' });
      }
    );
  });
});

// Submit draft → submitted
router.put('/:id/submit', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  db.get('SELECT * FROM shift_handoffs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Handoff not found' });
    if (row.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft handoffs can be submitted' });
    }
    if (req.user.role === 'nurse' && nurseIdFromReq(req) !== row.from_nurse_id) {
      return res.status(403).json({ error: 'Only the authoring nurse can submit this handoff' });
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE shift_handoffs SET status = 'submitted', submitted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [now, req.params.id],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        notifyIncoming(req.params.id, row.to_nurse_id, 'submitted', row.from_nurse_id);
        res.json({ message: 'Handoff submitted' });
      }
    );
  });
});

// Incoming nurse acknowledges receipt
router.put('/:id/acknowledge', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  db.get('SELECT * FROM shift_handoffs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Handoff not found' });
    if (row.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted handoffs can be acknowledged' });
    }

    const myNurseId = nurseIdFromReq(req);
    if (req.user.role === 'nurse') {
      if (myNurseId === row.from_nurse_id) {
        return res.status(400).json({ error: 'You cannot acknowledge your own handoff' });
      }
      if (row.to_nurse_id && row.to_nurse_id !== myNurseId) {
        return res.status(403).json({ error: 'This handoff is assigned to another nurse' });
      }
    }

    const now = new Date().toISOString();
    const ackNurseId = req.user.role === 'nurse' ? myNurseId : (req.body.to_nurse_id || row.to_nurse_id);
    const ackUserId = req.user.userId;

    db.run(
      `UPDATE shift_handoffs SET
        status = 'acknowledged',
        to_nurse_id = COALESCE(to_nurse_id, ?),
        acknowledged_at = ?,
        acknowledged_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [ackNurseId, now, ackUserId, req.params.id],
      function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });

        // Notify outgoing nurse
        db.get('SELECT user_id FROM nurses WHERE id = ?', [row.from_nurse_id], (nErr, nRow) => {
          if (!nErr && nRow) {
            db.run(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
              [nRow.user_id, 'Handoff acknowledged', `Your shift handoff #${req.params.id} was acknowledged.`, 'info']
            );
          }
        });

        res.json({ message: 'Handoff acknowledged' });
      }
    );
  });
});

// Delete draft only
router.delete('/:id', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  db.get('SELECT * FROM shift_handoffs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Handoff not found' });
    if (row.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Only draft handoffs can be deleted' });
    }
    if (req.user.role === 'nurse' && nurseIdFromReq(req) !== row.from_nurse_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.run('DELETE FROM shift_handoff_patients WHERE handoff_id = ?', [req.params.id], () => {
      db.run('DELETE FROM shift_handoffs WHERE id = ?', [req.params.id], function (dErr) {
        if (dErr) return res.status(500).json({ error: dErr.message });
        res.json({ message: 'Handoff deleted' });
      });
    });
  });
});

module.exports = router;
