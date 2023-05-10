//=========================================
// File Name: results.js
// Functions for view quiz results
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const correctAnsLogo = "smile.png"; 
const wrongAnsLogo = "ko.png";

function PageLoadResult()
{
	PrintTitleAndDescription();
	PrintStatusBar();
	PrintCopyrightMsg();

	var isRestored = RestoreQuiz();
	EndQuiz();
	var reportHtml = PrintReport();
	ShowProgressBarSavingResults();
	PrintFinalButtons();
	DisableRightClickMenu();
	closedFromBrowser = true;

	if (quiz.computeMarkErr !== 0)
	{
		HideProgressBarSavingResults();
		PrintErrorComputeMark('R');
		deleteCookie("qmake.quiz");
	}
	else if (!isRestored || !quiz.currentUser || (quiz.time === 0))
	{
		HideProgressBarSavingResults();
		PrintErrorLoadPageFailed();
	}
	else
	{
		if (options.needValuateQuiz && options.warnNeedRetake && options.allowRetakeQuiz && (quiz.mark <= options.upperMarkForRetake) && (quiz.numOfRetake < options.maxNumRetake))
		{
			PrintWarning("Devi ripetere il quiz in quanto il tuo voto è inferiore a " + options.upperMarkForRetake, 'R');
		}

		if (options.needSaveQuiz)
		{
			quiz.questions = RemoveUndefinedQuestions();
			PostResults(reportHtml);
		}
		else
		{
			deleteCookie("qmake.quiz");
		}
	}
}

function PrintReport()
{
	var reportHtml = "";

	if (GetTypeOfSubstitution(quiz.mark) === QMAKE_VALUATION_WITH_LINK)
	{
		var url = GetLinkFromMark(quiz.mark);
		GoToPage(url);
	}
	else
	{
		if (options.needValuateQuiz)
		{
			PrintReportSummary();

			if ((options.showFullReport) && (GetTypeOfSubstitution(quiz.mark) !== QMAKE_VALUATION_REPLACE_RESULTS))
			{
				PrintReportDetails();
			}
		}
		else
		{
			$('#idReportSummary').hide();
			PrintReportFinalMessage(options.msgForNoValuateQuiz);
        }
	}

	reportHtml += '<div id="idReport" class="container">' + $('#idReport').html() + '</div>';

	if (options.reportHideRevision) {
		ShowRevision(false);
	}

	return reportHtml;
}

function PrintReportSummary()
{
	if (options.reportWithDateTime)
	{
		// Date and time elapsed
		$('#idStartDate').text(DateToString(new Date(quiz.dateStartQuiz).getTime()));
		$('#idTimeElapsed').text(getTimeString(quiz.time));
	}
	else
	{
		// without date and time
		$('#idReportStartDate').hide();
		$('#idReportTimeElapsed').hide();
	}

	if (quiz.currentUser !== null) {
		if (quiz.currentUser.name !== '')
		{
			$('#idUserName').text(quiz.currentUser.name);
		}
		else
		{
			$('#idReportNameOrEmail').text('Email');
			$('#idUserName').text(quiz.currentUser.email);
		}
	}
	if (options.takeOnlyQuestions === 0) {
		$('#idNumOfQuestions').text(options.numOfQuestions);
	}
	else {
		$('#idNumOfQuestions').text(options.takeOnlyQuestions);
	}

	if (options.needValuateQuiz)
	{
		// quiz with evaluation
		if (GetTypeOfSubstitution(quiz.mark) === QMAKE_VALUATION_REPLACE_RESULTS)
		{
			$('#idReportSummary').hide();
			PrintReportFinalMessage(GetRemFromMark(quiz.mark));
		}
		else
		{
			var onlyOpenAns = IsQuizWithOnlyOpenAnswers();

			if (!onlyOpenAns)
			{
				$('#idCorrectAnswers').text(quiz.nRight);
				$('#idWrongAnswers').text(quiz.nWrong);
			}
			else {
				$('#idReportCorrectAnswers').hide();
				$('#idReportWrongAnswers').hide();
			}

			if (quiz.nNotAnswered > 0) {
				$('#idNotAnswered').text(quiz.nNotAnswered);
			}
			else {
				$('#idReportNotAnswered').hide();
			}

			if ((quiz.nNotValuated > 0) && !options.reportHideRowQstNotValuated) {
				$('#idNotValuatedAnswers').text(quiz.nNotValuated);
			}
			else {
				$('#idReportNotValuatedAnswers').hide();
			}

			if ((!onlyOpenAns) && (options.showFinalMark || options.showFinalPoints || options.markPercentage))
			{
				if (options.showFinalMark || options.markPercentage) $('#idLabelFinalMark').show();
				if (options.showFinalPoints) $('#idLabelFinalPoints').show();
				if ((options.showFinalMark || options.markPercentage) && options.showFinalPoints) $('#idLabelSeparatorMarkPoints').show();

				$('#idFinalResult').html(GetFinalResult());
			}
			else
			{
				$('#idReportFinalResult').hide();
			}
		}

		if (!options.allowRetakeQuiz)
		{
			$('#idReportNumRetake').hide();
		}
		else if (options.warnNeedRetake)
		{
			$('#idNumRetake').text(quiz.numOfRetake + " / " + options.maxNumRetake);
		}
		else
		{
			if (quiz.numOfRetake > 0)
			{
				$('#idNumRetake').text(quiz.numOfRetake);
			}
			else
			{
				$('#idReportNumRetake').hide();
			}
		}
	}
	else
	{
		// quiz with no evaluation
		$('#idReportNumOfQuestions').hide();
		$('#idReportCorrectAnswers').hide();
		$('#idReportWrongAnswers').hide();
		$('#idReportNotValuatedAnswers').hide();
		$('#idReportTimeElapsed').hide();
		$('#idReportFinalResult').hide();
		$('#idReportNumRetake').hide();
	}


}

function PrintReportFinalMessage(msg)
{
	$('#idReportFinalMessage').show();
	$('#idReportFinalMessage').html(msg);
}

function PrintReportDetails()
{
	var rootDiv = $('#divReportDetails');
	var textHtml = "";
	var colNum = 1;
	var qstNum;

	for (var i = 0; i < options.numOfQuestions; i++)  // quiz.questions.length
	{
		qstNum = quiz.ordineDomande[i] + 1;

		var question = quiz.questions[qstNum-1];

		if ((typeof question === 'undefined') || (question === null)) {
			continue;
		}

		if (colNum === 1)
		{
			textHtml += "<div class='row report_div_qst'>";
		}

		if (options.reportNumOfColumns === 1)
		{
			textHtml += "<div class='col-sm-12 report_div_qst'>";
		}
		else if (options.reportNumOfColumns === 2) {
			textHtml += "<div class='col-sm-6 report_div_qst'>";
		}
		else if (options.reportNumOfColumns === 3) {
			textHtml += "<div class='col-sm-4 report_div_qst'>";
		}
		else if (options.reportNumOfColumns === 4) {
			textHtml += "<div class='col-sm-3 report_div_qst'>";
		}
		else if (options.reportNumOfColumns === 5) {
			textHtml += "<div class='col-sm-2 report_div_qst'>";
		}
		else if (options.reportNumOfColumns >= 6) {
			textHtml += "<div class='col-sm-1 report_div_qst'>";
		}
		textHtml += PrintReportQuestionDetails(i+1,question);
		textHtml += "</div>"; 

		colNum++;
		if (colNum > options.reportNumOfColumns)
		{
			colNum = 1;
			textHtml += "</div>";
        }
	}
	rootDiv.html(textHtml);
	return textHtml;
}

function PrintReportQuestionDetails(qstNum,question)
{
	var htmlHeader, htmlQst, htmlAns;
	var textToDisplay;
	var textHtml = "";
	var resultMsg = "";

	textToDisplay = "" + qstNum + " / " + options.numOfQuestions;

	textHtml += "<div class='panel panel-primary qf-panel-question-class'>";

	htmlHeader = "<div class='panel-heading qf-panel-question-heading-class'><b>Domanda " + textToDisplay + "</b></div>";
	textHtml += htmlHeader;

	textHtml += "<div class='panel-body qf-panel-question-body-class'>";

	if (options.showFullQstReport)
	{
		htmlQst = "<p><b>" + getTextToDisplay(question.shortTextQuestion) + "</b></p>";
		textHtml += htmlQst;
	}

	if (question.valid === 1) {
		resultMsg = "Risposta corretta";
	}
	else if (question.valid === -1) {
		if (question.noChoice) {
			resultMsg = "Domanda senza risposta";
		}
		else {
			resultMsg = "Risposta errata";
		}
	}
	else if ((question.valid === 2) && !options.reportHideRowQstNotValuated) {
		resultMsg = "Domanda non valutata";
	}
	else if (question.valid === 3) {
		if (question.nScore === question.maxScore) {
			resultMsg = "Risposta corretta";
		}
		else if (question.nScore === question.minScore) {
			resultMsg = "Risposta errata";
		}
		else {
			resultMsg = "Risposta parzialmente corretta";
		}
	}
	textHtml += "<p class='revision-class'><i>" + resultMsg;

	//if ((question.valid === -1) && (question.typeOfQuestion === QMAKE_MULTIANS))
	//{
	//	textHtml += ". La risposta corretta era " + GetListOfRightAnsLetters(question);
	//}
	textHtml += "</i></p>";

	if (question.valid === 3)
	{
		if (question.minScore === 0) {
			if (question.typeOfQuestion === QMAKE_MATCHING) {
				textHtml += "<p class='revision-class'><i>Affermazioni corrette : " + question.nScore + "/" + question.maxScore + "</i></p>";
			}
			else {
				textHtml += "<p class='revision-class'><i>Punteggio : " + question.nScore + "/" + question.maxScore + "</i></p>";
			}
		}
		else {
			textHtml += "<p class='revision-class'><i>Punteggio : " + question.nScore + " [" + question.minScore + " , " + question.maxScore + "]</i></p>";
		}
	}

	for (var j = 0; j < question.answers.length; j++)
	{
		var answer = question.answers[j];

		htmlAns = PrintReportAnswerDetails(j+1, question.typeOfQuestion, answer);
		textHtml += htmlAns;
	}

	textHtml += "</div></div>";

	return textHtml;
}

function PrintReportAnswerDetails(numOfAns, typeOfQuestion, answer)
{
	var htmlAns = "";

	var imgHtml;
	var guessImg = "";
	var textAns;

	if ((typeOfQuestion === QMAKE_MULTIANS) ||
		(typeOfQuestion === QMAKE_MULTIANS_WITH_POINT) ||
		(typeOfQuestion === QMAKE_BOOLEAN))
	{
		if (answer.choice === 0) {
			imgHtml = "<img class='small-icon-image' src='../images/square.png'>";
		}
		else if (answer.choice === 1) {
			imgHtml = "<img class='small-icon-image' src='../images/ok.png'>";
		}

		if (options.reportNotation === QMAKE_REPNOT_PT) {
			if (answer.isGuess) {
				guessImg = `<img class='small-icon-image revision-class' src='../images/${correctAnsLogo}'>`;
			}
			else {
				guessImg = `<img class='small-icon-image revision-class' src='../images/${wrongAnsLogo}'>`;
			}
		}
		else if (options.reportNotation === QMAKE_REPNOT_SIMPLE)
		{
			var guessImgFilename = (answer.valuation > 0) ? correctAnsLogo : wrongAnsLogo;

			if ((!options.indicateOnlySelAns) || ((typeOfQuestion !== QMAKE_MULTIANS)) || (answer.choice === 1)) {
				guessImg = "<img class='small-icon-image revision-class' src='../images/" + guessImgFilename + "'>";
			}
			else {
				guessImg = "<img class='small-icon-image revision-class' src='../images/blank.png'>";
			}
		}

		htmlAns = "<p>" + guessImg + imgHtml;
		if (options.showFullAnsReport)
		{
			htmlAns += " " + getTextToDisplay(answer.shortTextAnswer);
		}
		else
		{
			htmlAns += "Risposta " + numOfAns;
		}
		htmlAns += "</p>";

		if (options.showFullRemReport)
		{
			htmlAns += "<p class='revision-class'><i>" + getTextToDisplay(answer.shortTextRemark) + "</i></p>";
		}
	}
	else if (typeOfQuestion === QMAKE_OPENANS)
	{
		htmlAns = "<p class='openAnswerTextReport'>" + getTextToDisplay(answer.additionalText) + "</p>";
    }
	else if (typeOfQuestion === QMAKE_FILLGAP)
	{
		if (answer.isGuess)
		{
			guessImg = `<img class='small-icon-image revision-class' src='../images/${correctAnsLogo}'>`;
			textAns = answer.choice;
		}
		else
		{
			var listOfCorrectGaps = "";
			for (k = 0; k < answer.valuation.length; k++) {
				var correctGap = answer.valuation[k].toString().trim();
				listOfCorrectGaps += (k===0?"":",") + correctGap;
			}
			guessImg = `<img class='small-icon-image revision-class' src='../images/${wrongAnsLogo}'>`;
			textAns = GetHtmlPairStrikeRevision(answer.choice, listOfCorrectGaps);
		}
		htmlAns = "<p>" + guessImg + textAns + "</p>";
	}
	else if (typeOfQuestion === QMAKE_MATCHING)
	{
		if (answer.isGuess)
		{
			guessImg = `<img class='small-icon-image revision-class' src='../images/${correctAnsLogo}'>`;
			textAns = answer.valuation[0];
		}
		else
		{
			guessImg = `<img class='small-icon-image revision-class' src='../images/${wrongAnsLogo}'>`;
			textAns = GetHtmlPairStrikeRevision(answer.choice[1], answer.valuation[0]);
		}
		htmlAns = "<p>" + guessImg + answer.choice[0] + " - " + textAns + "</p>";
    }
	return htmlAns;
}

function GetHtmlPairStrikeRevision(leftStr, rightStr)
{
	var html = "";
	if (leftStr)
	{
		var strikedWord = "<strike>" + leftStr + "</strike> => " + rightStr;

		html += "<span class='revision-class'>" + strikedWord + "</span>";
		html += "<span class='no-revision-class'>" + leftStr + "</span>";
	}
	else {
		html += "<span class='revision-class'> () => " + rightStr + "</span>";
	}
	return html;
}

function PrintFinalButtons()
{
	if (options.showPrintButton)
	{
		$('#idBtnPrint').show();
	}
	if (CanRetake(options.includeRepeatButton))
	{
		$('#idBtnRepeat').show();
	}
	if (options.showLinkButton)
	{
		$('#idBtnLinkback').show();
	}
}

function PostResults(reportHtml)
{
	if ((options.saveQuizMode === QMAKE_SEND_NODEJS) || (options.saveQuizMode === QMAKE_SEND_NODEJS_LOCAL))
	{
		PostResultsNodeJS(reportHtml);
	}
	else if (options.saveQuizMode === QMAKE_SEND_WEBAPP)
	{
		PostResultsWebApp();
	}
}

function DisableResultButtons(btnDisabled)
{
	$('#idBtnPrint').prop("disabled", btnDisabled);
	$('#idBtnRepeat').prop("disabled", btnDisabled);
	$('#idBtnLinkback').prop("disabled", btnDisabled);
	$('#idBtnExit').prop("disabled", btnDisabled);
}

///
/// Post results to NodeJS server
///
function PostResultsNodeJS(reportHtml)
{
	var key = options.name + "/" + quiz.currentUser.email;
	var tryCount = 0;

	$('html').addClass("wait");
	DisableResultButtons(true);

	quiz.options = options; // optimization : assing options to quiz only when necessary : when send results, after then, remove it from quiz object

	$.ajax({
		url: options.saveQuizUrl + '/results',
		type: 'POST',
		data: { name: key, quiz: JSON.stringify(quiz), report: reportHtml, origin: GetHtmlPage() },
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		success: function (data) {
			PostResultsSuccessCallback();
			tryCount = RETRY_RESULT_LIMIT + 1; // trick for execute 'complete' section

			var quizResult = JSON.parse(data);

			//if ((quizResult.prevResults === 0) || options.allowRetakeQuiz) {
			//	PostResultsSuccessCallback();
			//}
			//else {
			//	// already sent
			//	PostResultsWarningCallback();
			//}

			PostLogout(quizResult.id);
		},
		error: function (jqXHR, exception) {
			tryCount++;
			if (tryCount <= RETRY_RESULT_LIMIT) {
				//try again
				setTimeout(() => { $.ajax(this); }, RETRY_TIMEOUT);
				return;
			}
			PostResultsFailCallback(jqXHR, exception);
		},
		complete: function (xhr, textStatus) {
			if ((tryCount === 0) || (tryCount > RETRY_RESULT_LIMIT))
			{
				quiz.options = null;  // optimization : avoid a big cookie
				$('html').removeClass("wait");
				DisableResultButtons(false);
				HideProgressBarSavingResults();
			}
		} 
	});
}

///
/// Post results to Google web app
///
function PostResultsWebApp()
{
	var webAppData = encodeURI(GetDataForWebApp());
	var tryCount = 0;

	$('html').addClass("wait");
	DisableResultButtons(true);

	$.ajax({
		url: options.saveQuizUrl,
		type: 'POST',
		data: webAppData,
		contentType: "application/x-www-form-urlencoded",
		success: function (data) {
			PostResultsSuccessCallback();
			tryCount = RETRY_RESULT_LIMIT + 1; // trick for execute 'complete' section
		},
		error: function (jqXHR, exception) {
			tryCount++;
			if (tryCount <= RETRY_RESULT_LIMIT) {
				//try again
				setTimeout(() => { $.ajax(this); }, RETRY_TIMEOUT);
				return;
			}
			PostResultsFailCallback(jqXHR, exception);
		},
		complete: function (xhr, textStatus) {
			if ((tryCount === 0) || (tryCount > RETRY_RESULT_LIMIT))
			{
				$('html').removeClass("wait");
				DisableResultButtons(false);
				HideProgressBarSavingResults();
			}
		} 
	});
}

function PostLogout(id)
{
	$.ajax({
		url: options.saveQuizUrl + '/logout',
		type: 'post',
		data: { quizId: id, sessionId: quiz.currentUser.sessionId },
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		}
	});
}

function PostResultsSuccessCallback()
{
	PrintSuccess('Quiz salvato correttamente', 'R');
	deleteCookie("qmake.quiz");
}

//function PostResultsWarningCallback()
//{
//	PrintWarning('Risultato già acquisito. Questo invio verrà ignorato', 'R');
//	deleteCookie("qmake.quiz");
//}

function PostResultsFailCallback(jqXHR, exception)
{
	var msg = '';
	deleteCookie("qmake.quiz");

	if (jqXHR.status === 0) {
		msg = 'Not connect. Verify Network.';
	} else if (jqXHR.status === 404) {
		msg = 'Requested page not found. [404]';
	} else if (jqXHR.status === 500) {
		msg = 'Internal Server Error [500].';
	} else if (exception === 'parsererror') {
		msg = 'Requested JSON parse failed.';
	} else if (exception === 'timeout') {
		msg = 'Time out error.';
	} else if (exception === 'abort') {
		msg = 'Ajax request aborted.';
	} else {
		msg = 'Uncaught Error.' + jqXHR.responseText;
	}

	PrintError('Impossibile salvare i risultati del quiz : ' + msg, 'R');
}

function RemoveUndefinedQuestions() {

	var onlyValidQuestion = [];

	for (var i = 0; i < quiz.questions.length; i++)
	{
		qstNum = quiz.ordineDomande[i] + 1;
		var question = quiz.questions[qstNum - 1];

		if ((typeof question === 'undefined') || (question === null)) continue;
		onlyValidQuestion.push(question);
	}

	return onlyValidQuestion;
}

function GetDataForWebApp()
{
	var body = "";

	body += "vers=4";
	body += "&encrypt=0";
	body += "&title=" + encodeURIComponent(options.name);
	body += "&titleQuiz=" + encodeURIComponent(options.title);
	body += "&user=" + encodeURIComponent(quiz.currentUser.name);
	body += "&sendTime=" + DateToString(new Date(quiz.dateStartQuiz).getTime());
	body += "&nQuest=" + options.numOfQuestions;
	body += "&maxvoto=" + options.maxmark;
	body += "&timeout=" + options.maxtime;
	body += "&time=" + quiz.time;
	body += "&nc=" + quiz.nRight;
	body += "&ns=" + quiz.nWrong;
	var notValuatedQuests = options.numOfQuestions - quiz.nRight - quiz.nWrong;
	body += "&nr=" + notValuatedQuests;
	body += "&mark=" + quiz.mark;
	body += "&author=" + encodeURIComponent(options.author);
	body += "&argument=" + encodeURIComponent(options.argument);

	var qstIndex;
	//var qstNum;

	for (var i = 0; i < quiz.questions.length; i++)
	{
		//qstNum = quiz.ordineDomande[i] + 1;
		qstIndex = i + 1;

		//var question = quiz.questions[qstNum - 1];
		var question = quiz.questions[i];

		if ((typeof question === 'undefined') || (question === null)) continue;
	
		body += "&datastore" + qstIndex + "=" + question.typeOfQuestion + "," + question.shortTextQuestion;
		body += "&weight" + qstIndex + "=" + question.weight;
		body += "&risposta" + qstIndex + "=" + encodeURIComponent(GetListOfSelectedAnswers(question));
		body += "&score" + qstIndex + "=" + question.nScore + "," + question.maxScore;
	}

	return body;
}

function onPrintClick()
{
	window.print();
}

function onRepeatClick()
{
	var user = quiz.currentUser;
	var numRetake = quiz.numOfRetake;

	ClearQuiz();
	InitQuiz();

	quiz.currentUser = user; // preserve user information
	quiz.numOfRetake = numRetake + 1; // preserve retake number

	if (!options.isQuizAnonymous && options.needLogin) {
		// quiz with login : need to login again to get new session
		PostLogin(quiz.currentUser.email, quiz.currentUser.password, quiz.currentUser.domainId);
	}
	else {
		GoFirstPage();
	}
}

function PostLogin(email, passhash, domainId) {

	$('html').addClass("wait");
	DisableResultButtons(true);

	$.ajax({
		url: options.saveQuizUrl + '/login',
		type: 'POST',
		headers: {
			'X-DomainId': domainId,
			'X-GrantId': 1  // exe
		},
		data: { login: email, pwd: passhash },
		success: function (data) {
			var user = JSON.parse(data);
			quiz.currentUser = user;
			quiz.currentUser.domainId = domainId;

			PostSessionFirst();
		},
		error: function (xhr, textStatus, errorThrown) {
			if (xhr.status === 401) {
				PrintError('Utente non autorizzato', 'R');
			}
			else if (xhr.status === 404) {
				PrintError('Utente non trovato', 'R');
			}
			else {
				PrintError('Errore di login : ' + xhr.status + " - " + errorThrown, 'R');
			}
		},
		complete: function (xhr, textStatus) {
			$('html').removeClass("wait");
			DisableResultButtons(false);
		} 
	});
}

function PostSessionFirst()
{
	var quizDuplicate = JSON.parse(JSON.stringify(quiz));
	delete quizDuplicate.currentUser;
	delete quizDuplicate.options; // in this step, opt is always null
	delete quizDuplicate.isQuizRecovered;

	var contentObj = {
		sessionId: quiz.currentUser.sessionId,
		sessionData: quizDuplicate
	};
	var content = JSON.stringify(contentObj);

	$.ajax({
		url: options.saveQuizUrl + '/updatesessionfirst',
		type: 'POST',
		data: content,
		contentType: "application/json",
		headers: {
			Authorization: 'Bearer ' + quiz.currentUser.authToken
		},
		complete: function (xhr, textStatus) {
			GoFirstPage();
		}
	});
}


function onExitClick()
{
	GoToPage(FINAL_PAGE_URL);
}