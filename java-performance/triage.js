const categories = {
    latency: { title: "Slow requests or latency spikes", short: "Latency", questions: [
        ["pattern", "How does the slowdown appear?", [["constant", "Mostly constant", "Requests are consistently slower."], ["intermittent", "Intermittent spikes", "Latency jumps and recovers."], ["load", "Mostly under load", "Performance degrades as concurrency rises."], ["endpoint", "Specific endpoints", "Only particular operations are affected."]]],
        ["waiting", "Where does waiting seem to accumulate?", [["db", "Database / JDBC", "SQL, transactions, pools, or locks."], ["threads", "Threads / locks / queues", "Workers or synchronization are blocked."], ["remote", "Remote services", "HTTP, RPC, or another dependency."], ["unknown", "Not clear yet", "The waiting layer is not known."]]],
        ["evidence", "What evidence do you already have?", [["jfr", "JFR or profiler data", "A recording covers the affected period."], ["threads", "Thread dumps", "Dumps exist from the slowdown."], ["traces", "Traces / request timing", "APM or detailed timings are available."], ["little", "Very little", "Mostly logs, dashboards, or reports."]]]
    ]},
    cpu: { title: "High CPU or infrastructure cost", short: "CPU", questions: [
        ["relationship", "What happens to throughput when CPU rises?", [["scales", "Throughput rises too", "CPU corresponds to more completed work."], ["flat", "Throughput stays flat", "CPU climbs without useful throughput."], ["falls", "Throughput gets worse", "More load produces less useful work."], ["unknown", "Not measured", "The correlation is unclear."]], "Throughput means completed requests, transactions, jobs, or other useful work per unit of time."],
        ["profile", "Do you have a CPU profile?", [["yes", "Yes", "Hot methods or stacks are available."], ["jfr", "Only JFR", "A recording exists but needs analysis."], ["no", "No profile yet", "Only aggregate metrics are available."], ["container", "Container CPU only", "Limits or throttling may be involved."]]],
        ["recent", "Did the CPU increase follow a change?", [["deploy", "Recent deploy", "Code or dependencies changed."], ["traffic", "Traffic / workload changed", "Volume or workload shifted."], ["infra", "Runtime / infrastructure changed", "JDK, host, limits, or config changed."], ["none", "No obvious change", "No known trigger."]]]
    ]},
    memory: { title: "Memory growth or excessive GC", short: "Memory / GC", questions: [
        ["baseline", "What happens to heap after a major GC?", [["rising", "Baseline keeps rising", "Used heap after GC trends upward."], ["stable", "Stable baseline", "Heap falls back after collection."], ["full", "Stays near the limit", "Little headroom remains."], ["unknown", "Not sure", "Post-GC behavior is not available."]]],
        ["symptom", "What is the main runtime symptom?", [["pause", "Long GC pauses", "Latency spikes line up with collection."], ["frequency", "GC runs frequently", "Collection overhead is high."], ["oom", "OOM / container kill", "The process runs out of memory."], ["rss", "Process memory grows", "RSS rises unexpectedly."]]],
        ["evidence", "What memory evidence is available?", [["heap", "Heap dump", "A dump exists."], ["gc", "GC logs / JFR", "Allocation and collection telemetry exists."], ["metrics", "Only heap metrics", "Dashboards show usage only."], ["none", "Almost none", "No useful capture yet."]]]]
    },
    database: { title: "JDBC, database, or transaction pressure", short: "Database / JDBC", questions: [
        ["pool", "What is happening in the connection pool?", [["wait", "Requests wait for connections", "Acquisition time rises or times out."], ["max", "Pool stays near max", "Connections remain active."], ["normal", "Pool looks normal", "Connections appear available."], ["unknown", "Not measured", "Pool usage is not tracked."]]],
        ["transactions", "What do you know about transaction duration?", [["long", "Some are long-lived", "Transactions stay open too long."], ["open", "Possible open transactions", "The lifecycle looks suspicious."], ["short", "Mostly short", "Transactions finish quickly."], ["unknown", "Not measured", "Transaction lifetime is not visible."]]],
        ["db", "What does the database show?", [["locks", "Locks / blocked queries", "Waiters or lock chains are visible."], ["slow", "Slow queries", "Some SQL execution is slow."], ["busy", "High DB resource use", "The database looks saturated."], ["quiet", "Database looks quiet", "Application waits are high anyway."]]]]
    },
    concurrency: { title: "Concurrency or resource contention", short: "Concurrency", questions: [
        ["shape", "How does throughput change with concurrency?", [["plateau", "It plateaus", "More workers stop increasing throughput."], ["collapse", "It gets worse", "More concurrency reduces throughput."], ["normal", "It scales normally", "No obvious contention effect."], ["unknown", "Not measured", "There is no comparison yet."]]],
        ["threads", "What do thread dumps show?", [["blocked", "Many BLOCKED threads", "Threads contend on locks."], ["waiting", "Many WAITING / parked threads", "Workers wait on coordination."], ["deadlock", "Deadlock detected", "A cycle is known."], ["none", "No useful dump yet", "No capture covers the event."]]],
        ["resource", "Is a shared resource saturated?", [["executor", "Executor / queue", "A worker pool or queue is saturated."], ["db", "Database connections", "Threads compete for JDBC."], ["lock", "Specific lock", "A code path appears serialized."], ["unknown", "Not identified", "No resource is clear yet."]]]]
    },
    intermittent: { title: "Hard-to-reproduce production issue", short: "Intermittent", questions: [
        ["environment", "Where can the issue be reproduced?", [["prod", "Production only", "It has not reproduced elsewhere."], ["load", "Only under realistic load", "Lower environments differ."], ["data", "Specific data or tenant", "Only some workloads trigger it."], ["random", "No clear pattern", "Occurrences seem unrelated."]]],
        ["observer", "Does extra instrumentation change the problem?", [["disappears", "It often disappears", "Observation makes reproduction harder."], ["changes", "Behavior changes", "Timing or frequency shifts."], ["same", "No obvious effect", "Instrumentation changes little."], ["unknown", "Not tested", "This has not been compared."]]],
        ["capture", "What can you capture next time?", [["jfr", "JFR / profiler", "A bounded recording is possible."], ["threads", "Thread dumps", "Several snapshots can be captured."], ["metrics", "Metrics / traces / DB state", "Operational telemetry is available."], ["limited", "Very limited access", "New diagnostics are difficult."]]]]
    }
};
const categoryOptions = [
    ["latency", "Slow requests / latency", "Spikes, long-tail response times, or degraded throughput."], ["cpu", "High CPU / infrastructure cost", "Compute demand is high or scaling is inefficient."], ["memory", "Memory growth / GC", "Heap growth, OOMs, pauses, or high allocation."], ["database", "JDBC / database / transactions", "Connection waits, slow SQL, locks, or long transactions."], ["concurrency", "Concurrency / contention", "Blocked threads, deadlocks, queues, or scaling collapse."], ["intermittent", "Hard-to-reproduce issue", "Production-only, load-dependent, or intermittent behavior."]
];
const state = { category: null, answers: {}, step: 0 };
const wizard = document.getElementById("wizard");
const progressBar = document.getElementById("progressBar");
const stepLabel = document.getElementById("stepLabel");
const categoryLabel = document.getElementById("categoryLabel");
const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const parseOption = value => Array.isArray(value) ? value : value.split("|");

function renderCategory() {
    state.category = null;
    state.answers = {};
    state.step = 0;
    stepLabel.textContent = "Step 1";
    categoryLabel.textContent = "Choose a symptom";
    progressBar.style.width = "12%";
    wizard.innerHTML = `<div class="screen active"><h2 class="question-title">What are you seeing?</h2><p class="question-help">Start with the symptom, not the suspected cause.</p><div class="choices">${categoryOptions.map(([id, title, desc]) => `<button class="choice" data-category="${id}"><strong>${title}</strong><small>${desc}</small></button>`).join("")}</div><p class="fineprint">Everything runs locally in your browser. Nothing is submitted anywhere.</p></div>`;
    wizard.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => { state.category = button.dataset.category; renderQuestion(); }));
}

function renderQuestion() {
    const category = categories[state.category];
    const q = category.questions[state.step];
    const total = category.questions.length;
    const selected = state.answers[q[0]];
    stepLabel.textContent = `Step ${state.step + 2} of ${total + 2}`;
    categoryLabel.textContent = category.short;
    progressBar.style.width = `${18 + ((state.step + 1) / (total + 1)) * 62}%`;
    wizard.innerHTML = `<div class="screen active"><h2 class="question-title">${q[1]}</h2><p class="question-help">${q[3] || "Choose the closest match, even if you are not certain."}</p><div class="choices">${q[2].map(option => { const [id, title, desc] = parseOption(option); return `<button class="choice ${selected === id ? "selected" : ""}" data-answer="${id}"><strong>${title}</strong><small>${desc}</small></button>`; }).join("")}</div><div class="triage-controls"><button class="triage-btn triage-btn-secondary" id="backBtn">Back</button><button class="triage-btn triage-btn-primary" id="nextBtn" ${selected ? "" : "disabled"}>${state.step === total - 1 ? "Show triage" : "Next"}</button></div></div>`;
    wizard.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => { state.answers[q[0]] = button.dataset.answer; wizard.querySelectorAll("[data-answer]").forEach(item => item.classList.remove("selected")); button.classList.add("selected"); document.getElementById("nextBtn").disabled = false; }));
    document.getElementById("backBtn").addEventListener("click", () => state.step ? (state.step--, renderQuestion()) : renderCategory());
    document.getElementById("nextBtn").addEventListener("click", () => { if (!state.answers[q[0]]) return; state.step === total - 1 ? renderResult() : (state.step++, renderQuestion()); });
}

function renderResult() {
    const category = categories[state.category];
    const labels = category.questions.map(q => { const option = parseOption(q[2].find(item => parseOption(item)[0] === state.answers[q[0]]) || ["", "Not answered", ""]); return `${q[1]}: ${option[1]}`; });
    const answers = state.answers;
    let signals;
    let checks = [
        "Correlate throughput, concurrency, CPU, GC, dependency timing, thread state, and database evidence from the same window."
    ];

    if (state.category === "latency") {
        signals = [];
        if (answers.pattern === "load") signals.push("load-sensitive saturation or contention");
        if (answers.pattern === "constant") signals.push("a consistently slow dependency or application path");
        if (answers.pattern === "intermittent") signals.push("intermittent queueing, saturation, or timing-sensitive behavior");
        if (answers.pattern === "endpoint") signals.push("an endpoint-specific code path, query, or dependency");
        if (answers.waiting === "db") signals.push("database, transaction, or connection-availability pressure");
        if (answers.waiting === "threads") signals.push("thread, lock, executor, or shared-resource contention");
        if (answers.waiting === "remote") signals.push("downstream dependency latency or retry amplification");
        if (answers.waiting === "unknown") signals.push("a cross-layer bottleneck that needs timing evidence");
        if (!signals.length) signals.push("a latency bottleneck that needs correlation with runtime evidence");
        if (answers.waiting === "db") checks.push("Measure connection wait time, active pool usage, transaction duration, slow queries, and database lock activity.");
        if (answers.waiting === "threads") checks.push("Capture thread dumps or JFR during the slowdown and inspect blocked states, executor queues, and lock ownership.");
        if (answers.waiting === "remote") checks.push("Compare downstream timing, timeout, retry, and response-size metrics with the affected request window.");
        if (answers.evidence === "little") checks.push("Start with a short JFR recording or equivalent low-overhead production profile before changing tuning parameters.");
        if (answers.evidence === "jfr") checks.push("Use the JFR recording to compare hot methods, blocked time, allocation, and dependency timing during the slow requests.");
        if (answers.evidence === "threads") checks.push("Compare the thread dumps across the event to distinguish stable blocking from transient queue buildup.");
        if (answers.evidence === "traces") checks.push("Break request traces into application, database, and remote-service spans to locate the latency contribution.");
    } else if (state.category === "cpu") {
        const hasProfileEvidence = answers.profile === "yes" || answers.profile === "jfr";
        const profileCheck = answers.profile === "jfr"
            ? "Analyze the existing JFR recording for hot stacks, allocation, retries, blocking, and coordination overhead before collecting another profile."
            : answers.profile === "yes"
                ? "Inspect the existing CPU profile for hot stacks and distinguish productive work from retries, logging, or coordination overhead."
                : "Capture a CPU profile during the high-CPU period and identify hot stacks before changing JVM flags.";
        if (answers.relationship === "flat" && answers.recent === "deploy") {
            signals = [
                "The recent deploy is a strong candidate for the CPU increase, although it is not confirmed as the cause.",
                "CPU increased without a corresponding throughput increase, suggesting the additional CPU work may not be productive.",
                "Possible mechanisms include retries, increased allocation, logging, serialization or deserialization, synchronization or contention, polling or loops, or a newly hot application path."
            ];
            checks = [
                "Review the recent deploy and diff for loops or additional computation, retries, logging, allocation, serialization or deserialization, synchronization or locking, polling, changed request or query behavior, and newly introduced hot paths.",
                profileCheck,
                "If historical data is available, compare CPU profiles or relevant runtime metrics before and after the deploy.",
                "Correlate CPU with throughput, allocation rate, retries, queue depth, and GC activity."
            ];
        } else if (answers.relationship === "falls" && answers.recent === "deploy") {
            signals = [
                "The recent deploy is a strong lead for behavior introduced alongside the CPU increase, although it is not confirmed as the cause.",
                "Throughput worsened as CPU rose, which may indicate contention, retry amplification, queue buildup, or overload behavior introduced by the change."
            ];
            checks = [
                "Review the recent deploy and diff for changes to retries, synchronization, queues, polling, request or query behavior, and newly hot paths.",
                hasProfileEvidence ? (answers.profile === "jfr" ? "Analyze the existing JFR recording for evidence of contention, retries, queueing, or newly hot application stacks." : "Inspect the existing CPU profile for evidence of contention, retries, queueing, or newly hot application stacks.") : profileCheck,
                "Correlate CPU with throughput, retries, queue depth, blocked time, allocation rate, and GC activity."
            ];
        } else if (answers.recent === "infra") {
            signals = [
                "The runtime or infrastructure change is a strong lead for the CPU behavior, although it is not confirmed as the cause.",
                "Possible explanations include changed JDK behavior, container CPU throttling or limits, runtime configuration, host scheduling, or an environment change exposing existing application pressure."
            ];
            checks = [
                "Check the JDK, container CPU limits and throttling, runtime configuration, host scheduling, and other environment changes first.",
                hasProfileEvidence ? (answers.profile === "jfr" ? "Analyze the existing JFR recording and compare it with the runtime or infrastructure change window." : "Inspect the existing CPU profile and compare it with the runtime or infrastructure change window.") : "Capture a CPU profile during the high-CPU period after confirming the runtime and container conditions.",
                "Correlate CPU with throughput, throttling time, allocation rate, retries, queue depth, and GC activity."
            ];
        } else if (answers.recent === "traffic") {
            signals = [
                "The workload or traffic change may have exposed an existing capacity or contention bottleneck.",
                answers.relationship === "falls" ? "Throughput worsening as CPU rises suggests possible overload, retry amplification, queue buildup, or contention under the new workload." : "The changed workload shape should be compared with the CPU demand it produces."
            ];
            checks = [
                "Compare traffic volume and workload shape with concurrency, request or query mix, payload size, and the capacity of shared resources.",
                hasProfileEvidence ? (answers.profile === "jfr" ? "Analyze the existing JFR recording for work associated with the changed workload." : "Inspect the existing CPU profile for work associated with the changed workload.") : "Capture a CPU profile during the affected workload before changing JVM flags.",
                "Correlate CPU with throughput, allocation rate, retries, queue depth, and GC activity."
            ];
        } else {
            signals = [answers.relationship === "flat" ? "wasted work, excessive allocation, retries, or contention" : answers.relationship === "falls" ? "contention, retry amplification, queue buildup, or overload collapse" : answers.relationship === "scales" ? "a genuinely CPU-bound workload or insufficient capacity" : "a CPU bottleneck that needs correlation with useful throughput"];
            checks = [
                profileCheck,
                "Correlate CPU with completed requests, allocation rate, retries, queue depth, and GC activity."
            ];
            if (answers.profile === "container") checks.push("Check CPU throttling and container limits so scheduler pressure is not mistaken for application inefficiency.");
            if (answers.recent !== "none") checks.push("Compare the affected window against the recent application, workload, or runtime change.");
        }
    } else if (state.category === "memory") {
        signals = [answers.baseline === "rising" ? "object retention or a true heap leak" : answers.baseline === "stable" && answers.symptom === "frequency" ? "high allocation rate rather than classic retention" : answers.baseline === "full" ? "insufficient headroom, retention, or a live set near the heap limit" : answers.symptom === "rss" ? "heap or non-heap/native memory growth that needs to be separated" : "memory pressure that needs post-GC and allocation evidence"];
        checks = [
            "Graph used heap after GC, allocation rate, pause time, and request load over the same period.",
            "Determine whether the issue is retention, allocation volume, or memory outside the Java heap."
        ];
        if (answers.evidence === "heap") checks.push("Compare dominators and retained size rather than looking only at the largest object classes.");
        if (answers.evidence === "gc") checks.push("Use GC logs or JFR allocation data to separate allocation rate from pause and collector behavior.");
        if (answers.evidence === "none" || answers.evidence === "metrics") checks.push("Collect JFR or GC telemetry before changing collector or heap settings.");
    } else if (state.category === "database") {
        signals = [(answers.pool === "wait" || answers.pool === "max") && (answers.transactions === "long" || answers.transactions === "open") ? "connection starvation caused by transaction lifetime or connection ownership" : (answers.pool === "wait" || answers.pool === "max") && answers.db === "quiet" ? "connection availability pressure rather than raw database capacity" : answers.db === "locks" ? "database locking or transaction interaction" : answers.db === "slow" || answers.db === "busy" ? "query execution or database-side resource pressure" : "a JDBC or database bottleneck that needs pool, transaction, and database evidence correlated together"];
        checks = [
            "Measure connection acquisition time, active and idle pool usage, connection hold time, and transaction duration.",
            "Correlate those metrics with slow queries, lock waits, and database resource usage."
        ];
        if (answers.pool === "wait" || answers.pool === "max") checks.push("Avoid assuming that a larger pool is the fix. It can move the bottleneck into the database.");
        if (answers.transactions === "long" || answers.transactions === "open") checks.push("Trace transaction boundaries back to application request paths and verify where commits and rollbacks actually occur.");
    } else if (state.category === "concurrency") {
        signals = [answers.threads === "deadlock" ? "an actual deadlock requiring lock-order and root-cause analysis" : answers.shape === "collapse" ? "severe contention, queueing, or overload amplification" : answers.shape === "plateau" ? "a serialized or capacity-limited shared resource" : "possible contention that needs thread-state and resource-saturation evidence"];
        checks = [
            "Capture multiple thread dumps or JFR during the event rather than relying on a single snapshot.",
            "Compare throughput against active threads, queue depth, blocked time, and saturation of shared pools and resources."
        ];
        if (answers.resource === "db") checks.push("Include JDBC acquisition and transaction timing so database connection contention is not mistaken for a Java lock problem.");
        if (answers.resource === "executor") checks.push("Inspect queue growth and task service time before simply increasing worker count.");
        if (answers.resource === "lock") checks.push("Inspect lock ownership and acquisition order, especially if blocked time increases nonlinearly with concurrency.");
        if (answers.threads === "blocked") checks.push("Identify the contended monitor and owning thread from the blocked stack traces.");
        if (answers.threads === "waiting") checks.push("Separate legitimate parked workers from pool starvation by comparing wait states with queue and pool metrics.");
        if (answers.threads === "none") checks.push("Capture several thread dumps during the event so transient contention is visible.");
    } else {
        signals = [answers.observer === "disappears" || answers.observer === "changes" ? "a timing-sensitive concurrency, queueing, or workload interaction" : answers.environment === "load" ? "load-dependent saturation or contention" : answers.environment === "data" ? "a data-dependent path or workload-specific bottleneck" : "a production-only issue requiring better event-time evidence"];
        checks = [
            "Define a capture plan before the next occurrence: exact timestamps, request IDs, JVM state, thread state, dependency timing, and database state.",
            "Correlate signals by the same event window instead of analyzing JVM, application, and database dashboards independently."
        ];
        if (answers.capture === "limited") checks.push("Prioritize one low-overhead signal that can remain enabled continuously, such as bounded JFR or targeted metrics.");
        if (answers.capture === "jfr") checks.push("Configure a bounded JFR recording that can be retained around the next occurrence.");
        if (answers.observer === "disappears" || answers.observer === "changes") checks.push("Prefer low-overhead observability and repeated samples because heavy instrumentation may perturb the failure.");
    }
    const summary = ["Java Performance Triage Request", `Primary symptom: ${category.title}`, "", ...labels].join("\n");
    stepLabel.textContent = "Triage summary";
    categoryLabel.textContent = category.short;
    progressBar.style.width = "100%";
    wizard.innerHTML = `<div class="screen active"><div class="triage-result"><div><div class="triage-eyebrow">Initial direction</div><h2 class="question-title">${category.title}</h2><p class="question-help">This result narrows an investigation. It does not diagnose the system.</p></div><div class="result-card"><h3>What this may indicate</h3><ul>${signals.map(signal => `<li>${escapeHtml(signal)}</li>`).join("")}</ul></div><div class="result-card"><h3>What to check next</h3><ul>${checks.map(check => `<li>${escapeHtml(check)}</li>`).join("")}</ul></div><div class="result-card result-caution"><h3>Useful boundary</h3><p>Do not make a tuning change only because one metric looks suspicious. Confirm that the suspected layer explains the incident timing and behavior.</p></div><div class="result-card"><h3>Your intake summary</h3><textarea class="summary" id="summaryText" readonly>${escapeHtml(summary)}</textarea><div class="triage-actions"><button class="triage-btn triage-btn-primary" id="copyBtn">Copy summary</button><button class="triage-btn triage-btn-secondary" id="contactBtn">Contact PVR Labs with this summary</button><button class="triage-btn triage-btn-secondary" id="restartBtn">Start over</button></div><p class="inline-note">The summary is stored locally only when you choose to use it in the contact form.</p></div></div></div>`;
    document.getElementById("copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText(summary); document.getElementById("copyBtn").textContent = "Copied"; } catch { document.getElementById("summaryText").select(); document.execCommand("copy"); } });
    document.getElementById("contactBtn").addEventListener("click", () => {
        try {
            sessionStorage.setItem("pvrlabsTriageSummary", summary);
        } catch {}
        window.location.href = "/#contact";
    });
    document.getElementById("restartBtn").addEventListener("click", renderCategory);
}

renderCategory();
