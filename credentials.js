document.addEventListener('DOMContentLoaded', async () => {
    const SQL = await initSqlJs({ locateFile: file => `sql-wasm.wasm` });
    let db;

    // Load existing DB or create new
    const data = localStorage.getItem('user-db');
    if (data) {
      const uIntArray = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      db = new SQL.Database(uIntArray);

    } else {
      db = new SQL.Database();
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          birthdate TEXT,
          username TEXT UNIQUE,
          password TEXT,
        );
        CREATE TABLE IF NOT EXISTS goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          goal_text TEXT,
          color TEXT,
          target_number INTEGER,
          current_progress INTEGER
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          task_text TEXT NOT NULL,
          task_date TEXT NOT NULL,
          completed INTEGER DEFAULT 0
        );
      `);
    }
    // resetDatabase();

    const result = db.exec("SELECT * FROM users");

    if (result.length > 0) {
      const columns = result[0].columns;
      const values = result[0].values;

      console.log("Users:");
      values.forEach(row => {
        let rowData = {};
        columns.forEach((col, index) => {
          rowData[col] = row[index];
        });
      });
    } else {
      console.log("No users found.");
    }

    const goals = db.exec("SELECT goal_text, color, target_number, current_progress FROM goals WHERE user_id = 1");

    // if (goals.length > 0) {
    //   goals[0].values.forEach(([text, color, goal_num, current_progress]) => {
    //     console.log(`Goal: ${text}, Color: ${color}, Number: ${goal_num}, Progess: ${current_progress}`);
    //   });
    // } else {
    //   console.log("No goals found for user.");
    // }
     // Handle signup
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
    
        let hasValidationError = false;
    
        const name = document.getElementById('name').value.trim();
        const birthdate = document.getElementById('birthdate').value;
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
    
        // ✅ First, validate all goals
        const goalsToInsert = [];
    
        document.querySelectorAll('.goals li').forEach(item => {
          const text = item.querySelector('.editable').innerText.trim();
          const color = item.querySelector('.color-picker').value;
          const numberInput = item.querySelector('.end-goal');
          const number = parseInt(numberInput.value, 10);
    
          if (text !== '') {
            if (isNaN(number) || number <= 0) {
              hasValidationError = true;
              numberInput.style.border = '2px solid red';
            } else {
              numberInput.style.border = '';
              goalsToInsert.push({ text, color, number });
            }
          }
        });
    
        if (hasValidationError) {
          document.getElementById('message').textContent = "Please enter a valid number for all non-empty goals.";
          return;
        }
    
        try {
          // ✅ Insert user
          db.run(
            `INSERT INTO users (name, birthdate, username, password) VALUES (?, ?, ?, ?)`,
            [name, birthdate, username, password]
          );
    
          const userId = db.exec("SELECT last_insert_rowid() AS id")[0].values[0][0];
    
          // ✅ Insert all validated goals
          goalsToInsert.forEach(goal => {
            db.run(
              `INSERT INTO goals (user_id, goal_text, color, target_number, current_progress) VALUES (?, ?, ?, ?, ?)`,
              [userId, goal.text, goal.color, goal.number, 0]
            );
          });
    
          persistDB(db);
          document.getElementById('message').textContent = "Signup successful!";
          signupForm.reset();
          window.location.href = "index.html";
    
        } catch (err) {
          document.getElementById('message').textContent = "Signup failed: " + err.message;
        }
      });
    }
    

  // Handle login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const result = db.exec(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password]);
        

        if (result.length > 0) {
              const userId = result[0].values[0][0];
              document.getElementById('message').textContent = "Login successful!";
              sessionStorage.setItem('userId', userId); // store user ID
              window.location.href = "goal-tracker.html";
        } else {
            document.getElementById('message').textContent = "Invalid credentials.";
        }
      });
  }

  function persistDB(db) {
      const binaryArray = db.export();
      const base64 = btoa(String.fromCharCode(...binaryArray));
      localStorage.setItem('user-db', base64);
  }

  function resetDatabase() {
    db.run("DROP TABLE IF EXISTS goals;");
    db.run("DROP TABLE IF EXISTS users;");
  
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        birthdate TEXT,
        username TEXT UNIQUE,
        password TEXT
      );
      CREATE TABLE goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        goal_text TEXT,
        color TEXT,
        target_number INTEGER,
        current_progress INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        task_text TEXT NOT NULL,
        task_date TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
    `);
  
    localStorage.removeItem('sqliteDB');
    persistDB(db);
  
    console.log("Database reset.");
  }
});



  