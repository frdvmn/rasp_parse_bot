require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const { parseTeachers, parseSchedule } = require('./parse.js')

const { updateSession, getSession } = require('./database.js')

const token = process.env.BOT_TOKEN
const session = {}
const bot = new TelegramBot(token, { polling: true })

// Состояния бота
const states = {
	waitingForName: 'waiting_for_name',
	waitingForWeek: 'waiting_for_week',
	waitingForDay: 'waiting_for_day',
	parsed: 'parsed',
}

// Обработчик команд
bot.onText(/\/start/, async msg => {
	const chatId = msg.chat.id
	await updateSession(chatId, { state: states.waitingForName })
	bot.sendMessage(chatId, 'Кого хотите выбрать? Напишите фамилию и инициалы.')
})

// Обработка текстового сообщения
bot.on('text', async msg => {
	const chatId = msg.chat.id
	const text = msg.text
	const session = await getSession(chatId)

	switch (session.state) {
		case states.waitingForName:
			try {
				const teachers = await parseTeachers(
					'https://rasp.vgppk.ru/bp.htm',
					text
				)
				if (!teachers.length) {
					bot.sendMessage(chatId, 'Учитель не найден. Попробуйте еще раз.')
					break
				}
				const teacher = teachers[0]

				await updateSession(chatId, {
					state: states.waitingForWeek,
					teacher: teacher['Преподаватель'],
					link: teacher['Ссылка'],
				})

				const options = {
					reply_markup: {
						inline_keyboard: [
							[{ text: 'Числитель', callback_data: 'Числитель' }],
							[{ text: 'Знаменатель', callback_data: 'Знаменатель' }],
						],
					},
				}

				bot.sendMessage(chatId, 'Выберите неделю:', options)
			} catch (error) {
				bot.sendMessage(chatId, 'Ошибка при парсинге. Попробуйте еще раз.')
			}
			break
		case states.waitingForWeek:
			bot.sendMessage(chatId, 'Выберите день недели:')
			await updateSession(chatId, {
				state: states.waitingForDay,
				teacher: session.teacher,
				link: session.link,
			})
			break
		default:
			bot.sendMessage(chatId, 'Используйте команду /start для инициализации.')
	}
})

bot.on('callback_query', async query => {
	const chatId = query.message.chat.id
	const option = query.data
	const session = await getSession(chatId)

	switch (option) {
		case 'changeDay':
			const optionsDay = {
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Понедельник', callback_data: 'Понедельник' }],
						[{ text: 'Вторник', callback_data: 'Вторник' }],
						[{ text: 'Среда', callback_data: 'Среда' }],
						[{ text: 'Четверг', callback_data: 'Четверг' }],
						[{ text: 'Пятница', callback_data: 'Пятница' }],
					],
				},
			}
			bot.sendMessage(chatId, 'Выберите день:', optionsDay)
			await updateSession(chatId, {
				state: states.waitingForDay,
				teacher: session.teacher,
				link: session.link,
				week: session.week,
			})
			break

		case 'changeWeek':
			const weekOptions = {
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Числитель', callback_data: 'Числитель' }],
						[{ text: 'Знаменатель', callback_data: 'Знаменатель' }],
					],
				},
			}
			bot.sendMessage(chatId, 'Выберите неделю:', weekOptions)
			await updateSession(chatId, {
				state: states.waitingForWeek,
				teacher: session.teacher,
				link: session.link,
				week: session.week,
				day: session.day,
			})
			break
		case 'changeTeacher':
			bot.sendMessage(
				chatId,
				'Кого хотите выбрать? Напишите фамилию и инициалы.'
			)
			await updateSession(chatId, {
				state: states.waitingForName,
				teacher: session.teacher,
				link: session.link,
				week: session.week,
				day: option,
			})
			break
	}

	switch (session.state) {
		case states.waitingForWeek:
			await updateSession(chatId, {
				state: states.waitingForDay,
				teacher: session.teacher,
				link: session.link,
				week: option,
			})
			const optionsDay = {
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Понедельник', callback_data: 'Понедельник' }],
						[{ text: 'Вторник', callback_data: 'Вторник' }],
						[{ text: 'Среда', callback_data: 'Среда' }],
						[{ text: 'Четверг', callback_data: 'Четверг' }],
						[{ text: 'Пятница', callback_data: 'Пятница' }],
					],
				},
			}
			bot.sendMessage(chatId, 'Выберите день:', optionsDay)

			break
		case states.waitingForDay:
			await updateSession(chatId, {
				state: states.parsed,
				teacher: session.teacher,
				link: session.link,
				week: session.week,
				day: option,
			})
			const schedule = await parseSchedule(session.link)

			const selectedDay = schedule[session.week][option]

			let message = `${schedule['teacher']}
			\nРасписание на ${option}:\n`
			for (let i = 0; i < selectedDay.length; i++) {
				if (selectedDay[i]['isLesson']) {
					message += `${i + 1} пара - ${selectedDay[i]['subject']}, ${
						selectedDay[i]['aud']
					}, ${selectedDay[i]['group']}\n`
				} else {
					message += `${i + 1} пара - нет пары\n`
				}
			}
			const optionsAny = {
				reply_markup: {
					inline_keyboard: [
						[{ text: 'Изменить день', callback_data: 'changeDay' }],
						[{ text: 'Изменить неделю', callback_data: 'changeWeek' }],
						[
							{
								text: 'Изменить преподавателя',
								callback_data: 'changeTeacher',
							},
						],
					],
				},
			}
			bot.sendMessage(chatId, message, optionsAny)
			break
	}
})
