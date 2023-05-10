//=========================================
// File name: utility.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const htmlParser = require('node-html-parser');
const fileSystem = require('fs');

/// <summary>
/// Gets the remote IP
/// </summary>
function GetRemoteIp(req) {
	return (typeof req.headers['x-forwarded-for'] === 'string'
		&& req.headers['x-forwarded-for'].split(',').shift())
		|| req.connection.remoteAddress
		|| req.socket.remoteAddress
		|| req.connection.socket.remoteAddress
}

/// <summary>
/// Get the browser's User Agent
/// </summary>
function GetUserAgent(req)
{
	var ua = req.headers['user-agent'];
	if (ua) {
		return ua.substring(0, 255);
	}
	return null;
}

/// <summary>
/// Check if a string is in JSON format
/// </summary>
function IsJsonString(str)
{
	try
	{
		JSON.parse(str);
	}
	catch (e) {
		return false;
	}
	return true;
}

/// <summary>
/// Check if the parameter is a valid URL
/// </summary>
function IsValidHttpUrl(string)
{
	let url;

	try
	{
		url = new URL(string);
	}
	catch (e) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:";
}

/// <summary>
/// Generate a random password
/// </summary>
function GeneratePassword()
{
	var length = 8 + Math.floor(Math.random() * 4);
	var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	var retVal = "";

	for (var i = 0, n = charset.length; i < length; ++i)
	{
		retVal += charset.charAt(Math.floor(Math.random() * n));
	}
	return retVal;
}

/// <summary>
/// Generate v4 UUID (Universally unique identifier)
/// </summary>
function UUIDv4()
{
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

/// <summary>
/// Replace points automatically assigned with points from teacher review/examiner marking
/// </summary>
function ShowReviewPointsIntoReport(report, reviewPoints)
{
	const root = htmlParser.parse(report);

	var labelRow = root.querySelector('#idReportFinalResult');
	if (labelRow.getAttribute("style") === "display: none;") {
		labelRow.setAttribute("style", "display:block");
	}

	var labelMark = root.querySelector('#idLabelFinalMark');
	var labelPoints = root.querySelector('#idLabelFinalPoints');

	// if mark showed, not applicable
	if (labelMark.getAttribute("style") === "") {
		return report;
	}
	// if points hidden, show it
	if (labelPoints.getAttribute("style") === "display:none") {
		labelPoints.setAttribute("style", "display:block");
	}

	var pointsId = root.querySelector('#idFinalResult');

	pointsId.set_content(reviewPoints.toString());
	return root.toString();
}


function ReplacePointsFromReport(report, newPoints)
{
	const root = htmlParser.parse(report);

	var labelMark = root.querySelector('#idLabelFinalMark');
	var labelPoints = root.querySelector('#idLabelFinalPoints');

	if (labelMark.getAttribute("style") === "") {
		return report;
	}
	if (labelPoints.getAttribute("style") === "display:none") {
		return report;
	}
	// replace only with :
	// <span id="idLabelFinalMark" style="display:none">Voto</span>
	// <span id="idLabelFinalPoints" style="">Punteggio</span>

	var pointsId = root.querySelector('#idFinalResult');

	if (pointsId.text !== newPoints) {
		pointsId.set_content(newPoints);
		return root.toString();
	}
	return report;
}


function HideSummaryRowsFromReport(report)
{
	const root = htmlParser.parse(report);

	var divProgressSaving = root.querySelector('#idProgressSavingResults');
	var divCorrectAns = root.querySelector('#idReportCorrectAnswers');
	var divWrongAns = root.querySelector('#idReportWrongAnswers');
	var divNotAns = root.querySelector('#idReportNotAnswered');
	var divNotValAns = root.querySelector('#idReportNotValuatedAnswers');
	var divTimeElapsed = root.querySelector('#idReportTimeElapsed');
	var divFinalResult = root.querySelector('#idReportFinalResult');
	var divFinalPoints = root.querySelector('#idFinalPoints');
	var divFinalMark = root.querySelector('#idFinalMark');
	var divStartDate = root.querySelector('#idReportStartDate');

	if (!(divProgressSaving == null)) divProgressSaving.setAttribute("style", "display:none");
	if (!(divCorrectAns == null)) divCorrectAns.setAttribute("style", "display:none");
	if (!(divWrongAns == null)) divWrongAns.setAttribute("style", "display:none");
	if (!(divNotAns == null)) divNotAns.setAttribute("style", "display:none");
	if (!(divNotValAns == null)) divNotValAns.setAttribute("style", "display:none");
	if (!(divTimeElapsed == null)) divTimeElapsed.setAttribute("style", "display:none");
	if (!(divFinalResult == null)) divFinalResult.setAttribute("style", "display:none");
	if (!(divFinalPoints == null)) divFinalPoints.setAttribute("style", "display:none");
	if (!(divFinalMark == null)) divFinalMark.setAttribute("style", "display:none");
	if (!(divStartDate == null)) divStartDate.setAttribute("style", "display:none");

	return root.toString();
}


function CountFileLines(filePath)
{
	return new Promise((resolve, reject) => {
		let lineCount = 0;
		fileSystem.createReadStream(filePath)
			.on("data", (buffer) => {
				let idx = -1;
				lineCount--; // Because the loop will run once for idx=-1
				do {
					idx = buffer.indexOf(10, idx + 1);
					lineCount++;
				} while (idx !== -1);
			}).on("end", () => {
				resolve(lineCount);
			}).on("error", reject);
	});
};

// https://stackoverflow.com/questions/6525538/convert-utc-date-time-to-local-date-time
// warning : see comments in post, works not in all situation (i.e. timezone 30m instead 60m)
//function convertUTCDateToLocalDate(date) {
//	var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);

//	var offset = date.getTimezoneOffset() / 60;
//	var hours = date.getHours();

//	newDate.setHours(hours - offset);
//	return newDate;
//}

/// <summary>
/// Create a new GUID
/// </summary>
//function CreateGuid() {
//	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
//		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
//		return v.toString(16);
//	});
//}

module.exports = {
	GetRemoteIp,
	GetUserAgent,
	IsJsonString,
	IsValidHttpUrl,
	GeneratePassword,
	UUIDv4,
	ShowReviewPointsIntoReport,
	ReplacePointsFromReport,
	HideSummaryRowsFromReport,
	CountFileLines
}
