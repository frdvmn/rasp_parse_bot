const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('./sessions.db')

// Инициализация таблицы для хранения состояний
db.serialize(() => {
	db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            chatId INTEGER PRIMARY KEY,
            state TEXT,
            teacher TEXT,
            link TEXT,
            week TEXT,
						day	TEXT
        )
    `)
})

// Функция для получения состояния из базы данных
function getSession(chatId) {
	return new Promise((resolve, reject) => {
		db.get('SELECT * FROM sessions WHERE chatId = ?', [chatId], (err, row) => {
			if (err) return reject(err)
			resolve(row || {})
		})
	})
}

function updateSession(chatId, data) {
	return new Promise((resolve, reject) => {
		const { state, teacher, link, week, day } = data
		db.run(
			`
            INSERT INTO sessions (chatId, state, teacher, link, week, day)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(chatId) DO UPDATE SET
                state = excluded.state,
                teacher = excluded.teacher,
                link = excluded.link,
                week = excluded.week,
								day = excluded.day
            `,
			[chatId, state, teacher, link, week, day],
			err => (err ? reject(err) : resolve())
		)
	})
}

module.exports = {
	getSession,
	updateSession,
}
