async function run() {
  const url = "https://you-tube2-0-six-backend.onrender.com/2026-04-07T13-24-40.617Z-2025-06-25T06-09-29.296Z-vido.mp4";
  console.log("Checking:", url);
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log("HEAD Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    
    const res2 = await fetch(url, { method: "GET" });
    console.log("GET Status:", res2.status);
    const text = await res2.text();
    console.log("GET Body snippet:", text.substring(0, 200));
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
