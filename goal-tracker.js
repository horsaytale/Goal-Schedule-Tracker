// Load user-specific data
// sessionStorage.clear();
const userId = sessionStorage.getItem('userId');
if (!userId) {
  alert("No user logged in. Redirecting to login.");
  window.location.href = "index.html"; // or your login page
}

// Assume `db` is your loaded SQLite database
document.addEventListener('DOMContentLoaded', async () => {

    // EXTRACT Data from SQL Database
    const SQL = await initSqlJs({ locateFile: file => `sql-wasm.wasm` });
    let db;

    const saved = localStorage.getItem('user-db');
    if (saved) {
        const uIntArray = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
        db = new SQL.Database(uIntArray);
    } else {
        db = new SQL.Database(); // if no db yet, create fresh one
    }
    // ---------------------------------------------------------

    // db.run("DROP TABLE IF EXISTS goal_progress_history;");
    // db.run(`
    //     CREATE TABLE IF NOT EXISTS goal_progress_history (
    //         id INTEGER PRIMARY KEY AUTOINCREMENT,
    //         goal_id INTEGER,
    //         user_id INTEGER,
    //         task_id INTEGER,
    //         date TEXT,
    //         target_number INTEGER,
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

    // [USER ID] Condition on user Id to check whether user is logged in
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert("No user logged in. Redirecting to login.");
        window.location.href = "index.html";
        return;
    }

    // insert random picture
    const all_pics=["./pics/mainpg-pic/big-sunflower.png","./pics/mainpg-pic/cloud-1.png","./pics/mainpg-pic/landscape.png","./pics/mainpg-pic/rainbow-flower.png","./pics/mainpg-pic/rainbow-flower.png","./pics/mainpg-pic/smile-pink-flower.png","./pics/mainpg-pic/weather.png"]
    const random_pic=all_pics[Math.floor(Math.random() * all_pics.length)];
    document.querySelector(".intro-icon").innerHTML=`<img style="width:40px;" src=${random_pic}>`

    // Insert DAY / DATE / GREETINGS (INTRO)
    const dateStr = new Date().toISOString().split("T")[0];
    const [year, month, day] = dateStr.split("-");
    document.querySelector(".day").textContent=new Date().toLocaleDateString('en-US', { weekday: 'long' });
    document.querySelector(".date").textContent=`- ${day}/${month}/${year} -`;

    const logInUser = db.exec("SELECT * FROM users")[0].values[0][1];

    const icon_greetings=["./pics/hi.png","./pics/hello.png"]
    const random_icon=icon_greetings[Math.floor(Math.random() * icon_greetings.length)];

    const greetings=document.querySelector(".greetings-container")
    greetings.innerHTML=`<img src=${random_icon}><p>${logInUser.charAt(0).toUpperCase() + logInUser.substring(1).toLowerCase()} !</p>`

    let selectedDate = formatLocalDate(new Date());

    // [GOAL ELEMENTS]
    const container = document.getElementById("goals-details");
    const goalPopup = document.getElementById("goal-popup");
    const goalListContainer = document.getElementById("goal-list-container");
    const goalFormPopup = document.getElementById("goal-form-popup");
    const goalFormTitle = document.getElementById("goal-form-title");
    const goalColorInput = document.getElementById("goal-color");
    const goalTextInput = document.getElementById("goal-text");
    const goalTargetInput = document.getElementById("goal-target");

    let goalsEle = [];
    let editingIndex = null;

    // Initial load
    loadGoalsFromDB();
    
    // -------------------------
    // Event Listeners
    // -------------------------
    document.getElementById("open-goal-popup").addEventListener("click", () => {
        loadGoalsFromDB();
        // snapshot of original DB goals
        originalGoals = JSON.parse(JSON.stringify(goalsEle));
        goalPopup.classList.remove("hidden");
    });

    document.getElementById("cancel-goals-btn").addEventListener("click", () => {
        if (!hasChanges()) {
            // No changes → just close popup
            goalPopup.classList.add("hidden");
            return;
        }

        if (goalsEle.length === 0) {
            alert("You must have at least 1 goal before closing!");
            return;
        }

        if (confirm("Do you want to revert all the changes made here?")) {
            // Restore snapshot
            goalsEle = JSON.parse(JSON.stringify(originalGoals));
            renderGoalsPopup();
            renderMainGoals();
            goalPopup.classList.add("hidden");
        }

        // goalPopup.classList.add("hidden");
    });
    
    document.getElementById("save-goal-btn").addEventListener("click", () => {
        if (!confirm("Are you sure you want to save new changes?")) return;
        saveGoalsToDB();
        goalPopup.classList.add("hidden");
    });

    document.getElementById("add-goal-btn").addEventListener("click", () => {
        if (goalsEle.length >= 5) {
            alert("You can only have up to 5 goals.");
            return;
        }
        editingIndex = null;
        goalFormTitle.textContent = "Add Goal";
        goalColorInput.value = "#000000";
        goalTextInput.value = "";
        goalTargetInput.value = "";
        goalFormPopup.classList.remove("hidden");
    });
    
    document.getElementById("goal-cancel-btn").addEventListener("click", () => {
        goalFormPopup.classList.add("hidden");
    });

    // Submit add/edit
    document.getElementById("goal-submit-btn").addEventListener("click", () => {
        const color = goalColorInput.value;
        const text = goalTextInput.value.trim();
        const target = parseInt(goalTargetInput.value);
    
        if (!text || !target) {
            alert("Please fill all fields.");
            return;
        }
    
        if (editingIndex !== null) {
            goalsEle[editingIndex] = { ...goalsEle[editingIndex], color, goal_text: text, target_number: target };
        } else {
            goalsEle.push({ color, goal_text: text, target_number: target, id: Date.now(), current_progress: 0 });
        }
    
        renderGoalsPopup();
        renderMainGoals();
        goalFormPopup.classList.add("hidden");
    });

    // -------------------------
    // Functions
    // -------------------------
    function hasChanges() {
        return JSON.stringify(goalsEle) !== JSON.stringify(originalGoals);
    }

    function dateChangeFormat(date){
        const [year, month, day] = date.split("-");
        return `${day}/${month}/${year}`
    }

    function loadGoalsFromDB() {
        const dbGoals = db.exec(
            `SELECT id, color, goal_text, target_number, current_progress 
            FROM goals WHERE user_id = ?`, 
            [userId]
        )[0]?.values || [];

        goalsEle = dbGoals.map(([id, color, goal_text, target_number, current_progress]) => ({
            id,
            color,
            goal_text,
            target_number,
            current_progress
        }));

        renderMainGoals();
        renderGoalsPopup();
    }

    function saveGoalsToDB() {
        db.run(`DELETE FROM goals WHERE user_id = ?`, [userId]);
        goalsEle.forEach(g => {
            db.run(
                `INSERT INTO goals (id, user_id, color, goal_text, target_number, current_progress) VALUES (?, ?, ?, ?, ?, ?)`,
                [g.id, userId, g.color, g.goal_text, g.target_number, g.current_progress]
            );
        });
        persistDB(db);
        renderMainGoals();
    }

    function renderMainGoals() {
        const selectedDate = formatLocalDate(new Date());
        const historyData = db.exec(
            `SELECT * FROM goal_progress_history WHERE user_id = ? AND date = ?`,
            [userId, selectedDate]
        )[0]?.values || [];
    
        container.innerHTML = "";
    
        goalsEle.forEach(({ id, goal_text, color, target_number, current_progress }) => {
            const history = historyData.find(row => row[1] === id);
            const percent = Math.min((current_progress / target_number) * 100, 100).toFixed(1);
            const date_percent = history
                ? Math.min((history[6] / target_number) * 100, 100)
                : 0;
            const date_progress = history ? `${date_percent.toFixed(1)}%` : "No Data";
    
            const div = document.createElement("div");
            div.className = "goal-item";
            div.innerHTML = `
                <div class="goal-description flex-adjustment">
                    <img class="icon" src="./pics/multiple stars.png" alt="toggle">
                    <h6>${goal_text} <span class="no-wrap">[ ${current_progress}/${target_number} ]</span></h6>
                </div>
                <div class="goal-bar">
                    <div class="goal-progress" style="width: ${percent}%; background-color:${color};"></div>
                </div>
                <div class='digit-progress flex-adjustment-1'>
                    <small>Current Progress:</small>
                    <small>${percent}%</small>
                </div>
                <div class="goal-bar">
                    <div class="goal-progress date-progress" style="width: ${date_percent}%; background-color:${color};"></div>
                </div>
                <div class="date-progress-info flex-adjustment-1">
                    <small>${dateChangeFormat(selectedDate)} Progress:</small> 
                    <small>${date_progress}</small>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function renderGoalsPopup() {
        goalListContainer.innerHTML = "";
        goalsEle.forEach((g, index) => {
            const div = document.createElement("div");
            div.className = "goal-item";
            div.innerHTML = `
                <div class="goal-item-color" style="background:${g.color}"></div>
                <span>${g.goal_text} [ Target: ${g.target_number} ]</span>
                <div>
                    <button class="edit-goal-btn">
                        <img class="icon" src="./pics/edit-info.png" alt="edit">
                    </button>
                    <button class="delete-goal-btn">
                        <img class="icon" src="./pics/delete.png" alt="delete">
                    </button>
                </div>
            `;
    
            div.querySelector(".edit-goal-btn").addEventListener("click", () => {
                editingIndex = index;
                goalFormTitle.textContent = "Edit Goal";
                goalColorInput.value = g.color;
                goalTextInput.value = g.goal_text;
                goalTargetInput.value = g.target_number;
                goalFormPopup.classList.remove("hidden");
            });
    
            div.querySelector(".delete-goal-btn").addEventListener("click", () => {
                if (goalsEle.length === 1) {
                    alert("You must have at least 1 goal.");
                    return;
                }
                if (confirm("Are you sure you want to delete this goal?")) {
                    goalsEle.splice(index, 1);
                    renderGoalsPopup();
                    renderMainGoals();
                }
            });
    
            goalListContainer.appendChild(div);
        });
    }

    // -------------------------------------

    // Create A list of Tasks (uncompleted / completed)
    const taskList = document.getElementById("task-list");

    // Load tasks for date
    async function loadTasksForDate(date) {
        const stmt = db.prepare(`SELECT task_text, completed FROM tasks WHERE user_id = ? AND task_date = ?`);
        const tasks = [];
        stmt.bind([userId, date]);

        while (stmt.step()) {
            const [taskText, completed] = stmt.get();
            tasks.push({ text: taskText, completed });
        }
        stmt.free();

        taskList.innerHTML = '';
        if (tasks.length === 0) {
            const para = document.createElement('li');
            para.innerHTML = "<p style='margin:0; margin-right:5px;'>No tasks created yet</p><img class='icon' src='./pics/wallet.png' alt='toggle'>";
            para.classList.add("flex-adjustment")
            taskList.appendChild(para);
        } else {
            let completedTasks = 0;
            let pendingTasks = 0;
            tasks.forEach(task => {
                task.completed == 1 ? completedTasks++ : pendingTasks++;
            });

            if (pendingTasks > 0) {
                const para = document.createElement('li');
                para.innerHTML = `<p style='margin:0; margin-right:5px;'>${pendingTasks} ${pendingTasks == 1 ? 'task' : 'tasks'} still pending</p><img class='icon' src='./pics/pending.png' alt='toggle'>`;
                para.classList.add("flex-adjustment")
                taskList.appendChild(para);
            }

            if (completedTasks > 0) {
                const para = document.createElement('li');
                para.innerHTML = `<p style='margin:0; margin-right:5px;'>${completedTasks} ${completedTasks == 1 ? 'task' : 'tasks'} completed</p><img class='icon' src='./pics/check.png' alt='toggle'>`;
                para.classList.add("flex-adjustment")
                taskList.appendChild(para);
            }
        }
    }

    loadTasksForDate(selectedDate);

    // Create quote
    const quote_lists=["Small steps today become giant leaps tomorrow.","Dreams don’t work unless you do.","Consistency beats intensity every time.","Your future self will thank you for what you do today.","A goal without action is just a wish."]
    document.querySelector(".daily-quote").textContent=quote_lists[Math.floor(Math.random() * quote_lists.length)];


    // Create Calendar
    const calendarEl = document.getElementById("calendar");
    const monthYearEl = document.getElementById("monthYear"); // You'll need to add this in HTML
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth();

    // Render calendar for given month/year
    function renderCalendar(year, month) {
        calendarEl.innerHTML = ""; // clear old days
    
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
    
        // Show month/year label
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
        // Helper: update date-specific goal progress
        function updateGoalProgress(selectedDate) {
            const historyData = db.exec(
                `SELECT * FROM goal_progress_history WHERE user_id = ? AND date = ?`,
                [userId, selectedDate]
            )[0]?.values || [];
    
            const dateProgressBars = document.querySelectorAll(".date-progress");
            const dateProgressInfos = document.querySelectorAll(".date-progress-info");
    
            if (historyData.length === 0) {
                dateProgressBars.forEach(bar => bar.style.width = "0");
                dateProgressInfos.forEach(info => info.innerHTML = `<small>${dateChangeFormat(selectedDate)} Progress:</small> 
                    <small>No Data</small>`);
                return;
            }
    
            historyData.forEach((row, i) => {
                const target = row[5];
                const progress = row[6] || 0;
                const percent = (progress / target) * 100;
    
                if (dateProgressBars[i]) dateProgressBars[i].style.width = `${percent}%`;
                if (dateProgressInfos[i]) dateProgressInfos[i].innerHTML = `<small>${dateChangeFormat(selectedDate)} Progress:</small> 
                    <small>${percent.toFixed(1)}%</small>`;
            });
        }
    
        // Fill initial empty cells
        for (let i = 0; i < startDay; i++) {
            calendarEl.appendChild(document.createElement("div"));
        }
    
        // Days loop
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateEl = document.createElement("div");
            dateEl.className = "calendar-day";
            dateEl.textContent = day;
    
            const dateObj = new Date(year, month, day);
            const isoDate = formatLocalDate(dateObj);
    
            if (isoDate === selectedDate) {
                dateEl.classList.add("today");
            }
    
            dateEl.addEventListener("click", () => {
                selectedDate = isoDate;
                document.querySelectorAll(".calendar-day").forEach(d => d.classList.remove("today"));
                dateEl.classList.add("today");
    
                loadTasksForDate(selectedDate);
                updateGoalProgress(selectedDate);
            });
    
            calendarEl.appendChild(dateEl);
        }
    }
    
    // Navigation buttons
    document.getElementById("prevMonth").addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentYear, currentMonth);
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
    });

    // Initial load
    renderCalendar(currentYear, currentMonth);
    // showAllData(db)

    document.getElementById("schedule-btn").addEventListener("click", () => {
        window.location.href = `schedule.html?date=${selectedDate}`;
    });

    function formatLocalDate(date) {
        return date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format
    }
});

async function showAllData(db) {
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

function persistDB(db) {
    const binaryArray = db.export();
    const base64 = btoa(String.fromCharCode(...binaryArray));
    localStorage.setItem('user-db', base64);
}