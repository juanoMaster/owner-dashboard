fetch("https://owner-dashboard-navy.vercel.app/api/emails/nueva-reserva", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: "0aef0280-afb6-4b9a-bda2-65cedbc67d3c" })
  })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)