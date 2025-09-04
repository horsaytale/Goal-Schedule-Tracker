let db;

window.addEventListener("DOMContentLoaded", async()=>{
    const SQL = await initSqlJs({ locateFile: file => `sql-wasm.wasm` });

    const saved = localStorage.getItem('user-db');
    if (saved) {
        const uIntArray = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
        db = new SQL.Database(uIntArray);
    } else {
        db = new SQL.Database(); // if no db yet, create fresh one
    }

    // db.run(`
    //     CREATE TABLE IF NOT EXISTS goal_progress_history (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         goal_id INTEGER,
    //         user_id INTEGER,
    //         task_id INTEGER,
    //         date TEXT,
    //         progress_value REAL,
    //         FOREIGN KEY(goal_id) REFERENCES goals(id),
    //         FOREIGN KEY(user_id) REFERENCES users(id),
    //         FOREIGN KEY(task_id) REFERENCES tasks(id)
    //     );
    // `);
    // db.run("DELETE FROM goal_progress_history");
    // db.run(
    //     `UPDATE goals SET current_progress = ? WHERE id = ? AND user_id = ?`,
    //     [0, 1, 1]
    //   );
    // db.run(
    //     `UPDATE goals SET current_progress = ? WHERE id = ? AND user_id = ?`,
    //     [0, 2, 1]
    // );
    // const tables = ["goal_progress_history", "users", "goals", "tasks", "schedule", "notes"];

    // tables.forEach(table => {
    //     db.run(`DELETE FROM ${table}`);
    // });

    // // Optionally reset autoincrement counters
    // tables.forEach(table => {
    //     db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [table]);
    // });

    // persistDB(db)
    // showAllData()

    const params= new URLSearchParams(window.location.search);
    const date=params.get("date")

    if (!date) return;
    document.querySelector(".fixed-date").textContent=formatDisplayDate(date)
    document.querySelector(".fixed-day").textContent=getWeekday(date)

    const scheduleData=db.exec(`SELECT * FROM schedule WHERE date=?`, [date])[0]?.values || []
    const scheduleCells=document.querySelectorAll(".schedule-table .cell")

    scheduleData.forEach(([id, user_id, date, text, done],i)=>{
        if (!scheduleCells[i]) return
        const cell=scheduleCells[i]
        cell.innerText=text
        cell.setAttribute("contenteditable", done==0?"true":"false")
    
        if (done==1){
            cell.classList.remove("not-done")
            cell.classList.add("done")
        }else{
            !cell.classList.contains("not-done")?cell.classList.add("not-done"):
            cell.classList.remove("done")
        }
    
        const iconWrapper=cell.parentElement.querySelector("span:nth-child(3)")
        if(iconWrapper && text){
            const icon=iconWrapper.querySelector("i")
            if (icon){
                icon.classList.remove("fa-circle", "fa-circle-check")
                icon.classList.add(done==1?"fa-circle-check":"fa-circle")
            }
            iconWrapper.style.visibility="visible"
        }
    })

    // Reattach icon click listeners after DOM is built
    document.querySelectorAll(".schedule-table .assigned-plan").forEach(cell => {
        const icon = cell.parentElement.querySelector("span:nth-child(3) i");
        if (icon) {
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            clickedIcon(cell);
        });
        }
    });

    // --- TASKS ---
    const tasks = db.exec(`SELECT * FROM tasks WHERE task_date = ?`, [date])[0]?.values || [];
    const tasksInput=[...document.querySelectorAll(".tasks li")]

    tasksInput.forEach((li, i) => {
        // Create icon
        const icon = document.createElement("img");
        icon.className = "tree-icon";
        icon.src = "./pics/bare-tree.png";
        icon.style.visibility = "hidden"; // start hidden until text appears
        icon.contentEditable="false"

        // Create editable text span
        const span = document.createElement("span");
        span.className = "task-text";
        span.contentEditable = "true";

        // Check DB if there's saved data
        const task = tasks[i]; // assuming tasks[] comes from your DB SELECT
        if (task) {
            const [id, user_id, text, taskDate, completed] = task;
            span.textContent = text;

            if (text.trim()) {
            icon.style.visibility = "visible";
            }

            if (completed === 1) {
            span.style.textDecoration = "line-through";
            span.style.opacity = "0.5";
            icon.src = "./pics/tree.png";
            }
        }

        // Toggle completion on icon click
        icon.addEventListener("click", () => {
            const isCompleted = span.style.textDecoration === "line-through";
            if (isCompleted) {
                span.style.textDecoration = "";
                span.style.opacity = "1";
                icon.src = "./pics/bare-tree.png";
            } else {
                span.style.textDecoration = "line-through";
                span.style.opacity = "0.5";
                icon.src = "./pics/tree.png";
            }
            // TODO: update DB completion here
        });

        // Live check for text changes
        span.addEventListener("input", () => {
            icon.style.visibility = span.textContent.trim() ? "visible" : "hidden";
            if (!span.textContent.trim()) {
            span.style.textDecoration = "";
            span.style.opacity = "1";
            icon.src = "./pics/bare-tree.png";
            }
            // TODO: optionally update DB here as they type
        });

        // Reset li content & append
        li.innerHTML = "";
        li.appendChild(icon);
        li.appendChild(span);
    });

    // --- NOTES ---
    const notes = db.exec(`SELECT * FROM notes WHERE date = ?`, [date])[0]?.values || [];
    const notesElement=document.getElementById("note-details")
    notesElement.value=notes.length===0?"":notes[0][3]

    if (isPastDate(date)) {
        disableEditingForPastDate();
    }

    document.getElementById("save-button").addEventListener("click", async()=> await saveData())
    
    // -------- DATA ALERT ---------
    showAllData()
    // -------- DATA ALERT ---------

    // ------ REDIRECT TO GOAL ADJUSTMENT ------
    document.getElementById("openGoalAdjustment").addEventListener("click", () => {
        populateGoals(db, date);
        document.getElementById("goalModal").classList.remove("hidden");
    });
      
    document.getElementById("closeModal").addEventListener("click", () => {
        document.getElementById("goalModal").classList.add("hidden");
    });

    document.getElementById("saveGoalAdjustments").addEventListener("click", () => {
        saveGoalAdjustments(db, date);
    });

})

document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (!selectedText.trim()) return;

        // Check if selection is already inside <s> tag
        let commonAncestor = range.commonAncestorContainer;
        let parentElement = (commonAncestor.nodeType === 3) ? commonAncestor.parentElement : commonAncestor;

        if (parentElement.tagName === 'S') {
            // Already strikethrough -> Remove it
            const textNode = document.createTextNode(parentElement.textContent);

            parentElement.parentNode.replaceChild(textNode, parentElement);

            // Reset selection to the newly replaced text
            const newRange = document.createRange();
            newRange.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(newRange);

        } else {
            // Not strikethrough -> Apply it
            const s = document.createElement('s');
            s.textContent = selectedText;
            s.style.opacity=0.5

            range.deleteContents();
            range.insertNode(s);

            // Reset selection to the newly inserted <s> element
            const newRange = document.createRange();
            newRange.selectNodeContents(s);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }
});

document.getElementById("delete-button").addEventListener("click", ()=>{
    if (!confirm("Are you sure you want to delete all content?")) return

    document.querySelectorAll("[contenteditable='true']").forEach(cell=>cell.textContent="")
    document.querySelectorAll(".fa-circle-check").forEach(icon => {
        icon.classList.remove("fa-circle-check");
        icon.classList.add("fa-circle");
    });
    document.querySelectorAll(".done").forEach(doneCell=>{
        doneCell.classList.remove("done")
        doneCell.classList.add("not-done")
        doneCell.textContent=""
    })
    document.querySelectorAll(".fa-circle").forEach(icon=>icon.style.visibility="hidden")
    document.querySelectorAll(".notes li").forEach(item=>item.innerHTML="")
    document.querySelectorAll(".tasks li").forEach((item,i)=>{
        if (i>0) item.textContent=""
    })
    document.getElementById("note-details").value=""
})

document.querySelectorAll(".schedule-table .schedule-item").forEach(cell => {
    // handleIcon(cell)
    cell.addEventListener("input",()=>{
        handleIcon(cell.querySelector("span:nth-child(2)"))
    })
})

async function saveData() {
    const userId = sessionStorage.getItem('userId');

    const dateHeader = document.querySelector(".fixed-date").textContent;
    const convertFormatDate = formatDateKey(dateHeader);
    
    const schedule=[...document.querySelectorAll(".schedule-table .cell")].map(cell=>{
        // const icon=cell.parentElement.querySelector("span:nth-child(3) i")
        return {
            text: cell.innerText.trim(),
            done: cell.classList.contains("done")?1:0,
        }
    }).filter(cell=>cell.text.length>0);

    const tasks = [...document.querySelectorAll(".tasks li")].map(task => {
        const span = task.querySelector("span"); // editable text container
        const isCompleted = span && span.style.textDecoration.includes("line-through") ? 1 : 0;
        return {
            text: span ? span.textContent.trim() : "",
            isCompleted
        };
    }).filter(task => task.text.length > 0); // ✅ Only keep tasks with non-empty text

    const notes = document.getElementById("note-details").value;

    // Clear all schedule & tasks for the given date
    db.run("DELETE FROM schedule WHERE user_id = ? AND date = ?", [userId, convertFormatDate]);
    db.run("DELETE FROM tasks WHERE user_id = ? AND task_date = ?", [userId, convertFormatDate]);
    db.run("DELETE FROM notes WHERE user_id = ? AND date = ?", [userId, convertFormatDate]);

    // Non-blocking storage
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        schedule.forEach(activity => {
            db.run(
              `INSERT INTO schedule (user_id, date, text, done) VALUES (?, ?, ?, ?)`,
              [userId, convertFormatDate, activity.text, activity.done]
            );
        });

        tasks.forEach(task => {
          db.run(
            `INSERT INTO tasks (user_id, task_text, task_date, completed) VALUES (?, ?, ?, ?)`,
            [userId, task.text, convertFormatDate, task.isCompleted]
          );
        });

        db.run(
            `INSERT INTO notes (user_id, date, text) VALUES (?, ?, ?)`,
            [userId, convertFormatDate, notes]
        )

        persistDB(db);
        alert("Successfully saved!");
    } catch (err) {
        db.run("ROLLBACK");
        console.error("DB Insert Error:", err);
        alert(`Failed to save tasks: ${err.message}`);
    }
}

// call this after DOMContentLoaded
function enhanceTaskLi(li, opts = {}) {
    // opts: { emptySrc, fullSrc, onToggle } optional hooks
    const emptySrc = opts.emptySrc || './pics/bare-tree.png';
    const fullSrc  = opts.fullSrc  || 'full-tree.png';
  
    // If we've already enhanced this li, skip
    if (li.dataset.enhanced === "1") return;
    li.dataset.enhanced = "1";
  
    // preserve any existing inner HTML/text
    const initialHtml = li.innerHTML.trim();
    li.innerHTML = ''; // clear so we can re-structure
  
    // create icon and editable span
    const icon = document.createElement('img');
    icon.className = 'tree-icon';
    icon.src = emptySrc;
    icon.alt = 'toggle';
  
    const span = document.createElement('span');
    span.className = 'task-text';
    span.contentEditable = 'true';
    // restore previous content (allow existing formatting)
    span.innerHTML = (initialHtml === '' || initialHtml === '<br>') ? '' : initialHtml;
  
    // append in order
    li.appendChild(icon);
    li.appendChild(span);
  
    // helper to check empty
    function hasText() {
      return span.textContent.trim().length > 0;
    }
  
    // show/hide icon depending on content
    function updateIconVisibility() {
      if (hasText()) {
        icon.style.visibility = 'visible';
      } else {
        icon.style.visibility = 'hidden';
        // also clear completed state if text removed
        li.classList.remove('completed');
        icon.src = emptySrc;
      }
    }
  
    // toggle completed when icon clicked
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
  
      if (!hasText()) return; // ignore clicks if no text
  
      const nowCompleted = li.classList.toggle('completed');
      icon.src = nowCompleted ? fullSrc : emptySrc;
  
      // optional callback (e.g. update DB)
      if (typeof opts.onToggle === 'function') {
        // pass the li element, completed boolean and current text
        opts.onToggle(li, nowCompleted, span.textContent.trim());
      }
    });
  
    // when user types, show/hide icon
    span.addEventListener('input', () => {
      updateIconVisibility();
    });
  
    // handle paste/newlines: keep behaviour simple
    span.addEventListener('keydown', (e) => {
      // prevent Enter inserting <div> in contenteditable if you want single-line
      if (e.key === 'Enter') {
        e.preventDefault();
        // optionally blur to finish editing
        span.blur();
      }
    });
  
    // initial state
    updateIconVisibility();
}

function persistDB(db) {
    const binaryArray = db.export();
    const base64 = btoa(String.fromCharCode(...binaryArray));
    localStorage.setItem('user-db', base64);
}

function handleIcon(cell){
    const content=cell.textContent.trim()
    let icon=cell.parentElement.querySelector("span:nth-child(3)")
    if (!icon.hasListenerAttached) {
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            clickedIcon(cell);
        });
        icon.hasListenerAttached = true; // Custom property to track
    }
    
    if (content) {
        icon.style.visibility = "visible";
    } else {
        icon.style.visibility = "hidden";
        cell.classList.remove("done");
    }
}

function clickedIcon(cell){
    const icon=cell.parentElement.querySelector("span:nth-child(3) i")
    if (!icon) return
    if (icon.classList.contains("fa-circle")){
        cell.setAttribute("contenteditable", false)

        cell.classList.remove("not-done")
        cell.classList.add("done")

        icon.classList.remove("fa-circle")
        icon.classList.add("fa-circle-check")
    }else if(icon.classList.contains("fa-circle-check")){
        cell.classList.remove("done")
        cell.classList.add("not-done")
        cell.setAttribute("contenteditable","true")
        icon.classList.remove("fa-circle-check")
        icon.classList.add("fa-circle")
    }
}

function formatDisplayDate(dateStr){
    const [y,m,d]=dateStr.split("-")
    const months=["Jan", "Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return `${d} ${months[parseInt(m)-1]} ${y}`
}

function getWeekday(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return weekdays[dateObj.getDay()];
}

function formatDateKey(dateStr){
    const [day, monthStr, year]=dateStr.split(" ")
    const monthMap={Jan:"01", Feb:"02", Mar:"03", Apr:"04", May:"05", Jun:"06", Jul:"07", Aug:"08", Sep:"09", Oct:"10", Nov:"11", Dec:"12"}
    return `${year}-${monthMap[monthStr]}-${day.padStart(2, '0')}`;
}

async function showAllData() {
    if (!db) {
      alert("Database not loaded yet.");
      return;
    }
  
    try {
      const tables = ["users", "goals", "tasks","schedule", "notes", "goal_progress_history"];
  
      tables.forEach(table => {
        const result = db.exec(`SELECT * FROM ${table}`);
        console.log(`--- ${table.toUpperCase()} ---`);
  
        if (result.length === 0) {
          console.log("No data.");
          return;
        }
  
        const columns = result[0].columns;
        const values = result[0].values;
  
        values.forEach(row => {
          const rowData = {};
          row.forEach((value, index) => {
            rowData[columns[index]] = value;
          });
          console.log(rowData);
        });
      });
  
    } catch (err) {
      console.error("Error reading data:", err.message);
    }
}

function populateGoals(db, date) {
    const userId = sessionStorage.getItem('userId');
    const goalsData=getGoalsData(db, userId);
    const historyData = db.exec(`SELECT * FROM goal_progress_history WHERE user_id = ? AND date = ?`, [userId, date])[0]?.values || [];
    const list = document.getElementById("goalList");
    list.innerHTML = "";

    let historyGoals;

    const mainGoals = goalsData.map(row => ({
        id: row[0],
        user_id: row[1],
        goal_text: row[2],
        color: row[3],
        target: row[4],
        progress: row[5] != null ? row[5] : 0  // if no progress history, use 0
    }));

    // if (historyData.length===0){
        // console.log(mainGoals)
        mainGoals.forEach(goal => {
            const percent = Math.min((goal.progress / goal.target) * 100, 100);
    
            const container = document.createElement("div");
            container.classList.add("progress-container");
        
            container.innerHTML = `
                <div class="flex-adjustment">
                    <img class="icon" src="./pics/target.png" alt="toggle">
                    <h6 class="goal-title-progress">${goal.goal_text}</h6>
                </div>
                <div class="goal-numbers mt-2">
                    <p><span class="goal-designs">Target</span>: <strong>${goal.target}</strong> <span class="goal-designs ms-4">Total Progress</span>: 
                    <span class="current-progress" id="progress-${goal.id}">${goal.progress}</span></p> 
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="fill-${goal.id}" style="width: ${percent}%; background-color: ${goal.color};"></div>
                </div>
                <div class="progress-text" id="percent-${goal.id}">${percent.toFixed(1)}%</div>
                <input type="number" step="0.1" class="adjust-input" data-history-id="${goal.id}" data-goal-id="${goal.id}" placeholder="+/- adjustment"/>
            `;
            list.appendChild(container);
        });

    document.querySelectorAll(".adjust-input").forEach(input => {
      input.addEventListener("input", (e)=>handleAdjustment(e, mainGoals));
    });

    // Disable adjust inputs if this date is in the past
    const todayISO = (new Date()).toLocaleDateString('en-CA');
    if (date < todayISO) {
        document.querySelectorAll(".adjust-input").forEach(input => {
            input.disabled = true;
        });
    }
}
  
function handleAdjustment(e, goalsData) {
    const input = e.target;
    const goalId = parseInt(input.dataset.historyId);
    const adjustment = parseFloat(input.value) || 0;

    const goal = goalsData.find(g => g.id === goalId);
    if (!goal) return;
  
    let adjustedProgress = goal.progress + adjustment;
    if (adjustedProgress < 0) adjustedProgress = 0;
  
    const adjustedPercent = Math.min((adjustedProgress / goal.target) * 100, 100);
  
    // Update DOM
    document.getElementById(`fill-${goal.id}`).style.width = `${adjustedPercent}%`;
    document.getElementById(`percent-${goal.id}`).textContent = `${adjustedPercent.toFixed(1)}%`;
    document.getElementById(`progress-${goal.id}`).textContent = adjustedProgress.toFixed(1);
}

async function saveGoalAdjustments(db, date) {
    const userId = sessionStorage.getItem("userId");
    const goalsData=getGoalsData(db, userId);
    const inputs = document.querySelectorAll(".adjust-input");

    const mainGoals = goalsData.map(row => ({
        id: row[0],
        target: row[4],
    }));
    inputs.forEach(input => {
        // const adjustment = parseFloat(input.value) || 0;
        const historyId = parseInt(input.dataset.historyId);
        const goalId=parseInt(input.dataset.goalId);

        // Get current displayed progress from the DOM
        const currentProgressEl = document.getElementById(`progress-${historyId}`);
        if (!currentProgressEl) return;

        const currentProgress = parseFloat(currentProgressEl.textContent);
        if (isNaN(currentProgress)) return;

        // 1. Update current progress in goals table
        db.run(`
            UPDATE goals
            SET current_progress = ?
            WHERE id = ? AND user_id = ?
        `, [currentProgress, goalId, userId]);

         // 2. Check if history already exists for this goal/date
         const existing = db.exec(`
            SELECT id FROM goal_progress_history
            WHERE goal_id = ? AND user_id = ? AND date = ?
        `, [goalId, userId, date]);

        if (existing.length > 0) {
            // UPDATE instead of inserting a duplicate
            db.run(`
                UPDATE goal_progress_history
                SET progress_value = ?, target_number = ?
                WHERE goal_id = ? AND user_id = ? AND date = ?
            `, [currentProgress, mainGoals.find(g => g.id === goalId).target, goalId, userId, date]);
        } else {
            // INSERT if no existing record
            db.run(`
                INSERT INTO goal_progress_history (goal_id, user_id, date, target_number, progress_value)
                VALUES (?, ?, ?, ?, ?)
            `, [goalId, userId, date, mainGoals.find(g => g.id === goalId).target, currentProgress]);
        }

        input.value = "";
    });

    persistDB(db);
    alert("Successfully saved!");
}

function getGoalsData(db, userId) {
    return db.exec(`SELECT * FROM goals WHERE user_id = ?`, [userId])[0]?.values || [];
}

function isPastDate(dateStr) {
    const selected = new Date(dateStr);
    const today = new Date();
    // Set both to midnight to compare only date (ignore time)
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return selected < today;
}

function disableEditingForPastDate() {
    // Disable schedule cells
    document.querySelectorAll(".schedule-table .cell").forEach(cell => {
        cell.setAttribute("contenteditable", "false");
        cell.classList.add("view-only");
    });

    // Disable schedule icon click
    document.querySelectorAll(".done-icon").forEach(el=>el.style.pointerEvents = "none")

    // Disable tasks input (if any)
    document.querySelectorAll(".task-text").forEach(el => el.setAttribute("contenteditable", "false"));

    // Disable tasks icon click
    document.querySelectorAll(".tree-icon").forEach(el => el.style.pointerEvents = "none");

    // Disable notes textarea
    const notesTextarea = document.getElementById("note-details");
    if (notesTextarea) {
        notesTextarea.setAttribute("readonly", true);
        notesTextarea.classList.add("view-only");
    }

    document.getElementById("save-button").disabled=true
    document.getElementById("delete-button").disabled=true
    document.getElementById("saveGoalAdjustments").disabled=true
    document.querySelectorAll(".adjust-input").forEach(input=> input.disable=true)
    console.log("Adjust Input")
    console.log(document.querySelectorAll(".adjust-input"))

    // Optional: show notice
    const notice = document.createElement("div");
    notice.textContent = "This date is in the past. You can view but not edit.";
    notice.style.color = "gray";
    notice.classList.add("notice-date")
    document.querySelector(".body-content")?.prepend(notice);
}


  