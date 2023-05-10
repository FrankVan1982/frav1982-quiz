//=========================================
// File name: engine.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// Main functions for managing quizzes
//=========================================

var quiz = null;

var closedFromBrowser;
var isRestored;
var backupTimer = 0;

function PageLoad(questionIndex, questionTime)
{
	// restore quiz from browser local store
	isRestored = RestoreQuiz();
	if (!isRestored) {
		PrintErrorLoadPageFailed();
	}

	if (quiz.lastSessionId)
	{
		// restore quiz from session
		GetRecoverySession(questionIndex, questionTime);
		// if recovery session fails, continue page load anyway
	}
	else
	{
		ContinuePageLoad(questionIndex, questionTime);
	}
}

function ContinuePageLoad(questionIndex, questionTime)
{
	closedFromBrowser = true;

	if (!quiz.isQuizCompleted)
	{
		StartQuiz(questionIndex, questionTime);
	}
	else
	{
		GoToPage(FINAL_PAGE_URL);
	}

	if (!isRestored) {
		InvalidateQuiz();
		PauseTimer();
	}
}


function PageUnload()
{
	if (!closedFromBrowser) {
		StoreQuiz();
	}
	else {
		ClearQuiz();
	}
}

function PageUnloadIndex()
{
	if (!closedFromBrowser) {
		StoreQuiz(false);  // local storage
		StoreQuiz(true);   // cookie (per firefox)
		StoreUser();  // cookie per il PHP
	}
	else {
		// non dovrebbe essere necessario
		ClearQuiz();
	}
}

function InitQuiz()
{
	quiz = new Quiz(options.numOfQuestions);
	InitQuestionsOrder();
}

function StartQuiz(qstIndex, qstTime)
{
	quiz.currentQuestionIndex = qstIndex;
	quiz.timeToAnswer = qstTime;

	if ((quiz.currentQuestionPage === 1) && (quiz.startTime === 0)) // note time==0 to avoid reload
	{
		StartQuizOnFirstPage();
	}
	else 
	{
		StartQuizOnPage();
	}
}

function StartQuizOnFirstPage()
{
	quiz.dateStartQuiz = new Date();
	quiz.startTime = StartTime();

	StartQuizOnPage();
}

function StartQuizOnPage()
{	
	PrintTitleAndDescription();
	PrintStatusBar();
	RecoverySelectedQuestions();
	StartTimer();
	StartBackupTimer();
	PrintCountOfAnswers();
	PrintQuestionNumber();
	PrintRetireButton();
	PrintSavePartialButton();
	ShowHidePrevNextButton();
	DisableRightClickMenu();
	PlayBackgroundSound();
	ShowUniqueOkButton();
	PrintIntroEpilogueText();
	ShowQuestionMenu();

	if ((!options.questSlide) && options.randQuest)
	{
		ShuffleQuestionsSamePage();
	}

	var question = quiz.questions[quiz.currentQuestionIndex];

	if (typeof (question) !== "undefined" && question !== null)
	{
		if (question.alreadyAnswered)
		{
			RestoreSelection(question, quiz.currentQuestionIndex);
			PrintFeedback(question, quiz.currentQuestionIndex);
			ShowHideHintsAndFeedbacks(question, quiz.currentQuestionIndex);
		}
	}
	else if (options.questSlide)
	{
		if (quiz.timeToAnswer > 0)
		{
			ShowProgressBar();
			StartLocalTimerForQuest();
		}
		if (IsLastPage())
		{
			$('#idLinkNext').text('Completa');
		}
	}
	StorePage();
}

function StartTimer()
{
	if (options.maxtime > 0)
	{
		if (quiz.currentUser)
		{
			if (quiz.currentUser.otherFields)
			{
				if (quiz.currentUser.otherFields.hasOwnProperty("extratime"))
				{
					quiz.extraTime = quiz.currentUser.otherFields.extratime;
				}
			}
		}

		if (quiz.isQuizRecovered && options.ignoreOfflineTime)
		{
			// if is a recovery and we wish not include the time spent offline (the time from last answered question , then a lost session - ex. close event of browser - and a new login)
			var shadowTime = (Math.floor(new Date().getTime() / 1000) - quiz.updateTime)
			quiz.shadowDeltaTime += shadowTime;
			oldtime = quiz.startTime + quiz.shadowDeltaTime;
		}
		else
		{
			oldtime = quiz.startTime;
		}

		Timer();
	}
}

function StartBackupTimer()
{
	// backup is intended only for saving text of open answers
    if (((options.saveQuizMode === QMAKE_SEND_NODEJS) || (options.saveQuizMode === QMAKE_SEND_NODEJS_LOCAL)) && options.backupTextOpenAns && isRestored && (options.backupTime > 0))
	{
		if (backupTimer) {
			clearTimeout(backupTimer);
			backupTimer = 0;
		}
		backupTimer = setTimeout("BackupQuestion()", options.backupTime * 1000);
	}
}

function StoreQuiz(useCookie = false)
{
	if (quiz !== null) 
	{
		var jsonStr = JSON.stringify(quiz);

		if (!useCookie) {
			StoreValue("qmake.quiz", jsonStr);
		}
		else {
			setSessionCookie("qmake.quiz", jsonStr);
		}
	}
}

function StoreUser()
{
	var jsonStr = JSON.stringify(quiz.currentUser);
	setSessionCookie("qmake.user", jsonStr);
}

function StorePage()
{
	var html = $("body").html();
	StoreValue("qmake.page", html);
}

function GetHtmlPage()
{
	var html = RetrieveString("qmake.page");
	RemoveValue("qmake.page");
	return html;
}

function RecoverySelectedQuestions()
{
	if (!options.questSlide && quiz.isQuizRecovered)
	{
		for (var i = 0; i < options.numOfQuestions; i++)
		{
			var question = quiz.questions[i];
			if ((typeof question !== 'undefined') && (question !== null))
			{
				RestoreSelection(question, i);
				if (!question.alreadyAnswered)
				{
					// if the question is not null, the changes after recovery are not taken
					quiz.questions[i] = null;
				}
			}
		}
	}
}

function RestoreQuiz()
{
	var jsonStr;

	jsonStr = getCookie("qmake.quiz");
	if ((jsonStr !== '') && (jsonStr !== null)) {
		deleteSessionCookie("qmake.quiz");
	}

	if (jsonStr === '') {
		jsonStr = RetrieveString("qmake.quiz");
		RemoveValue("qmake.quiz");
	}

	if ((jsonStr !== '') && (jsonStr !== null))
	{
		quiz = JSON.parse(jsonStr);
		return true;
	}

	InitQuiz();
	return false;
}

function ClearQuiz()
{
	quiz = null;
	RemoveValue("qmake.quiz");
	RemoveValue("qmake.page");
	deleteCookie("qmake.quiz");
}


function EndQuiz()
{
	quiz.isQuizCompleted = true;

	if (quiz.dateCompleted === null) {
		var currentdate = new Date();
		quiz.dateCompleted = currentdate;
		quiz.dateCompletedStr = GetStringFromCurrentUtcDate();
	}

	PauseBackgroundSound();
	ComputeFinalTime();

	if (options.needValuateQuiz)
	{
		ComputeMarks();
	}
}

function InitNullQuestions()
{
	for (var i = 0; i < options.numOfQuestions; i++)  // quiz.questions.length
	{
		var question = quiz.questions[i];

		if ((typeof question === 'undefined') || (question === null)) {
			//if (!options.questSlide) {
				// in a same page, all init quest function are available
				// in a question per page, we have the script : initquestions.js
				quiz.questions[i] = allInitQuestionFunctions[i]();				
				DoValuateQuestion(quiz.questions[i]);
				DisableQuestion(quiz.questions[i], i);
				CountAnswers();
			//}
			//else {
			//	quiz.questions[i] = InitGhostQuestion(i);
			//}
		}
	}
}

function ResetQuestions()
{
	for (var i = 0; i < options.numOfQuestions; i++)  // quiz.questions.length
	{
		quiz.questions[i] = null;
		HideFeedback(i);
	}
}

function InitGhostQuestion(i)
{
	var blankPoint = options.noChoicePointsArray[i];
	var weight = options.weightsArray[i];

	var question = new Question(QMAKE_GHOST_QST, weight, 0, 0, 0, blankPoint);

	question.answers.length = 0;
	question.num = i+1;
	question.shortTextQuestion = "";
	question.timeToAnswer = 0;
	question.noChoice = true;

	var answer = new Answer(0, 0, 1, 0, "");
	question.answers.push(answer);

	return question;
}

function CanRetake(includeRetakeButton)
{
	return options.needValuateQuiz && ((options.allowRetakeQuiz && !options.warnNeedRetake && includeRetakeButton) || (options.warnNeedRetake && (quiz.numOfRetake < options.maxNumRetake) && (quiz.mark <= options.upperMarkForRetake)));
}

function IsQuizWithOnlyOpenAnswers()
{
	for (var i = 0; i < options.numOfQuestions; i++)
	{
		var question = quiz.questions[i];
		if ((typeof question !== 'undefined') && (question !== null))
		{
			if (question.typeOfQuestion !== QMAKE_OPENANS) {
				return false;
			}
		}
	}
	return true;
}

/////////////////////////////////////////////////////////

function onOkButtonClick(InitQuestion, callAfterConfirm = false)
{
	var question;
	var questionIndex = quiz.currentQuestionIndex;

	if ((options.questSlide && options.lockRightAns) || options.allowChangeChoiceAlways)
	{
		// valutate the choice always, until the answer is correct or until the quiz ends
		question = InitQuestion();
		if (question.noChoice && (question.typeOfQuestion === QMAKE_BOOLEAN || question.typeOfQuestion === QMAKE_MATCHING)) {
			PrintNeedToAnswerAllItem(questionIndex);
			ShowTopOfQuestion(questionIndex);
			return false;
		}
		if (question.noChoice && options.verifyAtLeastOneChoice) {
			PrintNeedToAnswer(questionIndex);
			ShowTopOfQuestion(questionIndex);
			return false;
		}
		if (!callAfterConfirm &&
			((question.noChoice && (question.typeOfQuestion === QMAKE_MULTIANS || question.typeOfQuestion === QMAKE_MULTIANS_WITH_POINT)) ||
			(options.askConfirmOkOpenAnswer && question.typeOfQuestion === QMAKE_OPENANS)))
		{
			PrintAskConfirmOK(InitQuestion);
			return false;
		}
		quiz.questions[questionIndex] = question;

		HideFeedback(questionIndex);
		ManageYourChoice(question, questionIndex);
	}
	else
	{
		// valutate the choice only the first time, otherwise prints that you have already answered to question
		question = quiz.questions[questionIndex];

		if (typeof (question) === "undefined" || question === null)
		{
			question = InitQuestion();
			if (question.noChoice && (question.typeOfQuestion === QMAKE_BOOLEAN || question.typeOfQuestion === QMAKE_FILLGAP || question.typeOfQuestion === QMAKE_MATCHING))
			{
				PrintNeedToAnswerAllItem(questionIndex);
				ShowTopOfQuestion(questionIndex);
				return false;
			}
			if (question.noChoice && options.verifyAtLeastOneChoice)
			{
				PrintNeedToAnswer(questionIndex);
				ShowTopOfQuestion(questionIndex);
				return false;
			}
			if (!callAfterConfirm &&
				((question.noChoice && (question.typeOfQuestion === QMAKE_MULTIANS || question.typeOfQuestion === QMAKE_MULTIANS_WITH_POINT)) ||
				(options.askConfirmOkOpenAnswer && question.typeOfQuestion === QMAKE_OPENANS)))
			{
				PrintAskConfirmOK(InitQuestion);
				return false;
			}

			quiz.questions[questionIndex] = question;
		}

		if ((options.questSlide) && (quiz.timeToAnswer > 0))
		{
			StopLocalTimer();
		}

		if (question.alreadyAnswered)
		{
			PrintDoneBefore(questionIndex);
		}
		else
		{
			ManageYourChoice(question, questionIndex);
		}	
	}	
	return true;
}

function ManageYourChoice(question, questionIndex)
{
	$('#divWarning' + questionIndex).hide();
	$('#divError' + questionIndex).hide();

	DoValuateQuestion(question);
	PrintFeedback(question, questionIndex);
	var quizDone = PrintCountOfAnswers();
	ShowHideHintsAndFeedbacks(question, questionIndex);
	ShowTopOfQuestion(questionIndex);
	ShowQuestionMenu();

	if (!options.isQuizAnonymous && options.needLogin && quiz.currentUser && quiz.currentUser.sessionId) {
		PostSession(question, questionIndex);
	}

	if (options.lockQuestionAfterConfirm) {
		DisableButtonClearQuestion(questionIndex);
		DisableQuestion(question, questionIndex);
	}

	if (quizDone)
	{
		EndQuiz();

		if (!options.questSlide && !options.uniqueOkButton)
		{
			PrintAnsweredToAllQuestions();
		}
	}
}

function onClearButtonClick(ClearQuestion)
{
	ClearQuestion();
}

function PostSession(question, questionIndex)
{
	if (options.saveSession)
	{
		var tryCount = 0;

		var contentObj = {
			sessionId: quiz.currentUser.sessionId,
			sessionData: {
				question,
				questionIndex,
				time: quiz.time,
				updateTime: Math.floor(new Date().getTime() / 1000),
				shadowDeltaTime: quiz.shadowDeltaTime,
				currentQuestionPage: quiz.currentQuestionPage
			}
		};
		var content = JSON.stringify(contentObj);

		$.ajax({
			url: options.saveQuizUrl + '/updatesession',
			type: 'POST',
			data: content,
			contentType: "application/json",
			headers: {
				Authorization: 'Bearer ' + quiz.currentUser.authToken
			},
			error: function (jqXHR, exception) {
				tryCount++;
				if (tryCount <= RETRY_SESSION_LIMIT) {
					//try again
					setTimeout(() => { $.ajax(this); }, RETRY_TIMEOUT);
					return;
				}
				else {
					ShowSnackbarError('Errore nel salvataggio sessione');
				}
			}
		});
	}
}

function SaveQuizPartial()
{
	var quizDuplicate = JSON.parse(JSON.stringify(quiz));
	delete quizDuplicate.currentUser;
	delete quizDuplicate.options; 
	delete quizDuplicate.isQuizRecovered;

	for (var i = 0; i < options.numOfQuestions; i++)
	{
		var question = quizDuplicate.questions[i];

		if ((typeof question === 'undefined') || (question === null)) {
			quizDuplicate.questions[i] = allInitQuestionFunctions[i]();
		}		
	}

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
		success: function (data) {
			ShowSnackbarSuccess('Quiz salvato correttamente');
		},
		error: function (jqXHR, exception) {
			ShowSnackbarError('Errore nel salvataggio sessione');
		},
		complete: function (xhr, textStatus) {
		}
	});
}

function onVerifyButtonClick()
{
	var hasError = false;
	var allOk;
	var index;
	for (index = 0; index < allInitQuestionFunctions.length; ++index)
	{
		quiz.currentQuestionIndex = index;
		allOk = onOkButtonClick(allInitQuestionFunctions[index], true);
		if (!allOk) hasError = true;
	}

	if (hasError)
	{
		ResetQuestions();
		PrintCountOfAnswers();
		PrintVerifyFailed();
	}
	else
	{
		// all questions are formally ok
		HideQuestionMenu();
		HideRetireButton();
		HideUniqueOkButton();
		ShowQuizResultsButton();
		EndQuiz();
	}
}

function onQuizResultsButtonClick()
{
	GoToPage(RESULT_PAGE_URL);
}

function onAbandonButtonClick()
{
	PrintAskAbandonQuiz();
}

function onSavePartialButtonClick()
{
	SaveQuizPartial();
}

function onPrintQuizButtonClick()
{
	window.print();
}

function BackupQuestion()
{
	try
	{
		if (!quiz.isQuizCompleted && !quiz.isQuizAbandoned)
		{
			if (!options.questSlide)
			{
				BackupQuestionOpenAnswer(quiz.currentQuestionIndex);

				if (quiz.prevQuestionIndex !== quiz.currentQuestionIndex)
				{
					BackupQuestionOpenAnswer(quiz.prevQuestionIndex);
					quiz.prevQuestionIndex = quiz.currentQuestionIndex;
				}
			}
			else
			{
				BackupQuestionOpenAnswerOnePage(quiz.currentQuestionIndex);
			}

			backupTimer = setTimeout("BackupQuestion()", options.backupTime * 1000);
		}
	}
	catch(error)
	{
		console.error(error);
	}
}

///
/// backup only open answer question, and only if isn't already answered
///
function BackupQuestionOpenAnswer(index)
{
	var backupQuestion;
	var question = quiz.questions[index];

	if (NeedBackup(question))
	{
		// in a same page, all init quest function are available
		if (index >= 0 && index < allInitQuestionFunctions.length)
		{
			backupQuestion = allInitQuestionFunctions[index]();
			if (backupQuestion.typeOfQuestion === QMAKE_OPENANS)
			{
				PostSession(backupQuestion, index);
			}
		}
	}
}

///
/// backup only open answer question, and only if isn't already answered
///
function BackupQuestionOpenAnswerOnePage(index)
{
	var backupQuestion;
	var question = quiz.questions[index];

	if (NeedBackup(question))
	{
		var num = index + 1;		
		backupQuestion = window["InitQuestion" + num]();
		if (backupQuestion.typeOfQuestion === QMAKE_OPENANS)
		{
			PostSession(backupQuestion, index);
		}		
	}
}

///
/// backup only if question isn't already answered
///
function NeedBackup(question)
{
	var needBackup = false;
	if (typeof (question) !== "undefined" && question !== null)
	{
		if (!question.alreadyAnswered)
		{
			needBackup = true;
		}
	}
	else
	{
		needBackup = true;
	}
	return needBackup;
}



