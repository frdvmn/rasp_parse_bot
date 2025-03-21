const axios = require('axios')
const cheerio = require('cheerio')
const iconv = require('iconv-lite')

async function parseSchedule(url) {
	try {
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
		})

		const html = iconv.decode(response.data, 'win1251')

		//  Загружаем HTML в Cheerio
		const $ = cheerio.load(html)

		// Извлекаем нужные данные
		const teacher = $('.lrg2 h1').text()
		const tableRows = $('.inf > tbody tr')

		const dayRowsFirst = {
			1: 2,
			2: 9,
			3: 16,
			4: 23,
			5: 30,
			6: 37,
			7: 44,
		}
		const dayRowsSecond = {
			1: 53,
			2: 60,
			3: 67,
			4: 74,
			5: 81,
			6: 88,
			7: 95,
		}

		function getScheduleDay(startRow) {
			let scheduleData = []
			for (let index = startRow; index <= startRow + 5; index++) {
				lessonNum = tableRows.eq(index).find('.hd:last').text()

				if (tableRows.eq(index).find('.ur').length > 0) {
					tableRows
						.eq(index)
						.find('.ur')
						.each((index, element) => {
							const group = $(element).find('.z1').text()
							const aud = $(element).find('.z2').text()
							const subject = $(element).find('.z3').text()

							scheduleData.push({
								lessonNum,
								group,
								aud,
								subject,
								isLesson: true,
							})
						})
				} else {
					scheduleData.push({
						lessonNum,
						isLesson: false,
					})
				}
			}

			return scheduleData
		}

		const result = {
			Числитель: {
				Понедельник: getScheduleDay(dayRowsFirst[1]),
				Вторник: getScheduleDay(dayRowsFirst[2]),
				Среда: getScheduleDay(dayRowsFirst[3]),
				Четверг: getScheduleDay(dayRowsFirst[4]),
				Пятница: getScheduleDay(dayRowsFirst[5]),
				Суббота: getScheduleDay(dayRowsFirst[5]),
				Воскресенье: getScheduleDay(dayRowsFirst[5]),
			},
			Знаменатель: {
				Понедельник: getScheduleDay(dayRowsSecond[1]),
				Вторник: getScheduleDay(dayRowsSecond[2]),
				Среда: getScheduleDay(dayRowsSecond[3]),
				Четверг: getScheduleDay(dayRowsSecond[4]),
				Пятница: getScheduleDay(dayRowsSecond[5]),
				Суббота: getScheduleDay(dayRowsSecond[5]),
				Воскресенье: getScheduleDay(dayRowsSecond[5]),
			},
		}

		return { teacher, ...result }
	} catch (error) {
		console.error(error)
	}
}

async function parseTeachers(url) {
	try {
		const response = await axios.get(url, {
			responseType: 'arraybuffer',
		})

		const html = iconv.decode(response.data, 'win1251')

		//  Загружаем HTML в Cheerio
		const $ = cheerio.load(html)

		const teachers = []
		$('.z0').each((index, element) => {
			teachers.push({
				Преподаватель: $(element).text(),
				Ссылка: `https://rasp.vgppk.ru/${$(element).attr('href')}`,
			})
		})

		const inputName = 'семичев е.а'
		const regex = new RegExp(inputName, 'i')

		teachers.filter(el => el['Преподаватель'].match(regex))
	} catch (error) {
		console.error(error)
	}
}

const url = 'https://rasp.vgppk.ru/bp791.htm'
const urlTeachers = 'https://rasp.vgppk.ru/bp.htm'
// parseSchedule(url).then(data => console.log(data))
parseTeachers(urlTeachers)
