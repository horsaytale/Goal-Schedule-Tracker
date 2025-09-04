// // Create a SQLite db object first
// let db;
// initSqlJs({locateFile: file =>'sql-wasm.wasm'}).then(SQL => {
//     // Create an in-memory database
//     db=new SQL.Database()

//     // [1] Create 'users' table 
//     db.run(`
//         CREATE TABLE IF NOT EXISTS users (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             username TEXT NOT NULL,
//             password TEXT NOT NULL
//         );    
//     `)

//     // [2] Insert default test user (optional)
//     const result = db.exec("SELECT COUNT(*) FROM users");
//     const userCount = result[0].values[0][0];
//     if (userCount === 0) {
//         db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', '1234']);
//         console.log("Inserted test user: admin / 1234");
//     }

//     // Step 3: Handle login
//     document.getElementById('login-form').addEventListener('submit', function (e) {
//         e.preventDefault();

//         const username = document.getElementById('username').value.trim();
//         const password = document.getElementById('password').value.trim();

//         const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
//         stmt.bind([username, password]);

//         if (stmt.step()) {
//         const user = stmt.getAsObject();
//         document.body.innerHTML = `<h2>Good morning, ${user.username}! 👋</h2>`;
//         } else {
//         document.getElementById('message').textContent = "Invalid username or password.";
//         }

//         stmt.free();
//     });
// })

// initSqlJs({ locateFile: file => `sql-wasm.wasm` }).then(SQL => {
//     const db = new SQL.Database(); // ready to use
// });

initSqlJs({
    locateFile: file=> `sql-wasm.wasm`
}).then(SQL => {
    let db;
    // Load from localStorage if it exists
    const data=localStorage.getItem('sqlite-db')

    if (data){
        const u8 = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        db=new SQL.Database(u8);
        console.log("Database loaded from local storage")
    }else{
        db=new SQL.Database();
        console.log("Created new database.");
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                password TEXT NOT NULL
            );
        `);
    }


    // 🔄 Save database to localStorage
    const binaryArray = db.export();
    const base64 = btoa(String.fromCharCode(...binaryArray));
    localStorage.setItem('sqlite-db', base64);
    console.log("Database saved to localStorage.");


    // Step 3: Handle login
    document.getElementById('login-form').addEventListener('submit', function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
        stmt.bind([username, password]);

        if (stmt.step()) {
        const user = stmt.getAsObject();
        document.body.innerHTML = `<h2>Good morning, ${user.username}! 👋</h2>`;
        } else {
        document.getElementById('message').textContent = "Invalid username or password.";
        }

        stmt.free();
    });
})

