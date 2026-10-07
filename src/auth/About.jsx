/** Plain-English introduction shown from the sign-in screen, for people deciding whether to sign up. */
export default function About({ onBack, onSignup }) {
  return (
    <div className="auth">
      <div className="card about">
        <button className="linkbtn" style={{ justifySelf: 'start' }} onClick={onBack}>← Back to sign in</button>
        <h1><b>Founders</b> Desk</h1>
        <p>Run your design studio from one place: leads, meetings, tasks, client payments and office costs. It replaces WhatsApp reminders, Excel sheets and “did anyone call that client?”</p>
        <p className="meta">Every partner gets a private desk, and the whole studio shares one live view. Works on laptop and phone.</p>

        <h2>Who it’s for</h2>
        <p>Architecture, interiors and liaisoning studios with 2 to 20 people who handle enquiries, site visits, client payments and office bills every week.</p>
        <p className="meta">Not for you if you need invoicing, GST, payroll or full accounting, or if you work alone and only need a to-do list.</p>

        <h2>What you get</h2>
        <ul>
          <li><b>Today:</b> your to-dos, tasks from partners, bills due soon, and tomorrow’s meetings with a ready WhatsApp confirmation.</li>
          <li><b>Tasks and Calendar:</b> daily, weekly and monthly lists, yearly goals, and a shared calendar of meetings.</li>
          <li><b>Expenses:</b> your personal spending and reminders for rent, EMI and insurance.</li>
          <li><b>Leads:</b> every enquiry from Enquiry to Advance received. Then it becomes a project.</li>
          <li><b>Projects and Commercial:</b> amount quoted, payments received, balance due, office costs and monthly profit.</li>
        </ul>

        <h2>Who sees what</h2>
        <ul>
          <li><b>Only you:</b> your tasks, goals and personal expenses.</li>
          <li><b>Whole studio:</b> meetings, leads and assigned tasks.</li>
          <li><b>Owner and admins:</b> projects and studio money. Members don’t see it.</li>
        </ul>

        <h2>Is it for you?</h2>
        <p>If two or more of these sound familiar, give it a try:</p>
        <ul>
          <li>Enquiries slip through without a follow-up.</li>
          <li>You ask a partner “did the client pay?”</li>
          <li>You forget to confirm meetings or pay bills on time.</li>
          <li>You want staff to handle leads without seeing the finances.</li>
        </ul>

        <button className="btn-p" onClick={onSignup}>Create an account</button>
      </div>
    </div>
  )
}
