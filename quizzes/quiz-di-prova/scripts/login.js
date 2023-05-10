//=========================================
// File name: login.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// Functions for registration and login operations
//=========================================

function PageLoadIndex()
{
	DisableRightClickMenu();
	ClearQuiz();
	InitQuiz();
	closedFromBrowser = true;

	if (!options.isQuizAnonymous)
	{
		$('#loginPanelId').show();
		$('#loader').hide();

		// quiz with login or only the student name 
		if (options.needLogin)
		{
			// quiz with login 

			// check parameters in browser URL location
			let searchParams = new URLSearchParams(window.location.search);
			for (var i = 0; i < options.urlParamArray.length; i++) {
				var urlParam = options.urlParamArray[i];
				if (!searchParams.has(urlParam)) {
					PrintWarning('Parametri mancanti per l&apos;autorizzazione al login', 'I');
					break;
				}
			}

			$('#idFieldName').hide();
			if (!options.selfRegistrationLink) {
				$('#idRegistrationLink').hide();
			}

			if (options.loginInsteadEmail) {
				$('#labelEmailId').text("Login:");
				$('#email').attr("placeholder", "Enter login");
			}

			if (options.authFromUrlParams)
			{
				if (searchParams.has('login') && searchParams.has('pwd')) {
					var login = searchParams.get('login');
					var pwdHash = searchParams.get('pwd');
					var domainId = 0;
					if (searchParams.has('dom')) {
						domainId = searchParams.get('dom');
					}
					$('#email').val(login);
					PostLogin(login, pwdHash, domainId);
				}
			}
		}
		else
		{
			// quiz with only the student name 
			$('#idFieldEmail').hide();
			$('#idFieldPassword').hide();
			$('#idRegistrationLink').hide();
		}
		PrintTitleAndDescription();
		PrintEngagementRules();
		PrintStatusBar();
		PrintCopyrightMsg();
	}
	else
	{
		// anonymous quiz

		if ((options.needSaveQuiz) && ((options.saveQuizMode === QMAKE_SEND_NODEJS) || (options.saveQuizMode === QMAKE_SEND_NODEJS_LOCAL)))
		{
			PostLogin(USER_EMAIL_ANONYMOUS, USER_PWDHASH_ANONYMOUS, 0);
			$('#loader').hide();
		}
		else
		{
			$('#loader').hide();
			quiz.currentUser = new Login(USER_LOGIN_ANONYMOUS, USER_EMAIL_ANONYMOUS, '', null, null, 0);
			GoFirstPage('./pages/');
		}
	}
}

function onRegistration()
{
	var name = "";  // build using 'identity' attribute
	var email = $('#email').val();
	var pwd = $('#pwd').val();
	var pwd2 = $('#pwd2').val();

	if ((!options.needSaveQuiz) || (options.saveQuizMode !== QMAKE_SEND_NODEJS && options.saveQuizMode !== QMAKE_SEND_NODEJS_LOCAL))
	{
		PrintError('Il quiz non è stato creato in modalità salvataggio su server', 'X');
		return;
	}

	var numOfOtherRegField = parseInt($('#numOtherRegistrationFields').val());

	var index;
	var isMandatory;
	var isIdentity;
	var otherFieldValue;
	var otherFieldName;
	var jsonText = "[";

	var missingMandatoryField = false;
	for (index = 1; index <= numOfOtherRegField; index++)
	{
		otherFieldValue = $('#otherField' + index.toString()).val();
		otherFieldName = $('#otherField' + index.toString()).attr('placeholder');

		if (jsonText !== "[") jsonText += ",";
		jsonText += "{";
		jsonText += "\"Name\" : \"" + otherFieldName.trim() + "\",";
		jsonText += "\"Value\" : \"" + otherFieldValue.trim() + "\"";

		// check if exist a URL param
		urlParam = $('#urlParamOtherField' + index.toString()).val();
		if (urlParam.length > 0) {
			jsonText += ",\"Param\" : \"" + urlParam.trim() + "\"";
		}

		jsonText += "}";

		// check if field is mandatory
		isMandatory = $('#isMandatoryOtherField' + index.toString()).val();
		if ((isMandatory === "true") && (otherFieldValue === ""))
		{
			missingMandatoryField = true;
		}

		// check if field is identity
		isIdentity = $('#isIdentityOtherField' + index.toString()).val();
		if (isIdentity === "true")
		{
			if (name !== "") name += " ";
			name += otherFieldValue;
		}


	}
	jsonText += "]";

	if (email === "" || pwd === "" || missingMandatoryField)
	{
		PrintWarning('Tutti i campi con (*) sono obbligatori', 'X');
	}
	else if (!options.loginInsteadEmail && !ValidateEmail(email))
	{
		PrintWarning('Inserire un indirizzo email valido', 'X');
    }
	else if (pwd !== pwd2)
	{
		PrintWarning('Le password non coicidono', 'X');
	}
	else
	{
		var passhash = CryptoJS.MD5(pwd).toString();
		var login = new Login(name, email, passhash, null, null, 0);
		login.otherFields = JSON.parse(jsonText); 

		var loginJson = JSON.stringify(login);

		GetCheckLogin(email, loginJson);
	}
}

function GetCheckLogin(loginKey, loginData)
{
	$('html').addClass("wait");
	$('#registrationBtnId').prop("disabled", true);

	$.ajax({
		url: options.saveQuizUrl + '/checklogin',
		type: 'GET',
		data: { login: loginKey },
		success: function (msg)
		{
			PrintError('Utente già registrato', 'X');

			$('html').removeClass("wait");
			$('#registrationBtnId').prop("disabled", false);
		},
		complete: function (xhr, textStatus)
		{
			if (xhr.status === 404)
			{
				PostRegistration(loginData);
			}
			else if (xhr.status !== 200)
			{
				PrintError('Server error, http status = ' + xhr.status, 'X');

				$('html').removeClass("wait");
				$('#registrationBtnId').prop("disabled", false);
			}
		}
	});
}

function PostRegistration(loginData)
{
	$.ajax({
		url: options.saveQuizUrl + '/registration',
		type: 'POST',
		data: loginData,
		contentType: "application/json; charset=utf-8",
		success: function (msg) {
			PrintRegistrationSuccess();
		},
		error: function (xhr, textStatus, errorThrown ) {
			PrintError('Errore di registrazione : ' + xhr.status + (errorThrown ? (" - " + errorThrown) : ""), 'X');
		},
		complete: function (xhr, textStatus) {
			$('html').removeClass("wait");
			$('#registrationBtnId').prop("disabled", false);
		}		
	});
}

function onLogin()
{
	if (options.needLogin)
	{
		if ((!options.needSaveQuiz) || (options.saveQuizMode !== QMAKE_SEND_NODEJS && options.saveQuizMode !== QMAKE_SEND_NODEJS_LOCAL))
		{
			PrintError('Il quiz non è stato creato in modalità salvataggio su server', 'I');
			return;
		}

		var email = $('#email').val();
		var pwd = $('#pwd').val();
		var passhash = CryptoJS.MD5(pwd).toString();

		PostLogin(email, passhash, 0);
	}
	else
	{
		var name = $('#name').val();
		if (name.length > 0)
		{
			if ((options.needSaveQuiz) && ((options.saveQuizMode === QMAKE_SEND_NODEJS) || (options.saveQuizMode === QMAKE_SEND_NODEJS_LOCAL)))
			{
				PostLogin(USER_EMAIL_ANONYMOUS, USER_PWDHASH_ANONYMOUS, 0);
			}
			else
			{
				quiz.currentUser = new Login(name, USER_EMAIL_ANONYMOUS, '', null, null, 0);
				StartQuizNow();
			}
		}
		else
		{
			PrintError('Il campo nome non può essere vuoto', 'I');
		}
	}
}

function PostLogin(email, passhash, domainId)
{
	$('html').addClass("wait");
	$('#loginBtnId').prop("disabled", true);

	$.ajax({
		url: options.saveQuizUrl + '/login',
		type: 'POST',
		headers: {
			'X-DomainId': domainId,
			'X-GrantId': 1  // exe
		},
		data: { login: email, pwd: passhash, search: window.location.search },
		success: function (data, textStatus, jqXHR)
		{
			//if (jqXHR.status !== "204") {
			var user = JSON.parse(data);
			user.domainId = domainId;

			if (!options.isQuizAnonymous && !options.needLogin) {
				// the real name instead of "anonymous"
				var name = $('#name').val();
				if (name && name.length > 0) {
					user.name = name;
				}
			}
			quiz.currentUser = user;

			GetCheckQuiz(options.name, user.email, user.authToken);
			//}
		},
		error: function (xhr, textStatus, errorThrown) {

			EnsureMessageBoxVisibility();

			if (xhr.status === 401) {
				PrintError('Utente non autorizzato', 'I');
			}
			else if (xhr.status === 404) {
				PrintError('Utente non trovato', 'I');
			}
			else  {
				PrintError('Errore di login : ' + xhr.status + (errorThrown ? (' - ' + errorThrown) : ''), 'I');
			}

			$('html').removeClass("wait");
			$('#loginBtnId').prop("disabled", false);
		},
		complete: function (xhr, textStatus)
		{
		} 
	});
}

function GetCheckQuiz(quizname, email, authToken)
{
	$.ajax({
		url: options.saveQuizUrl + '/checkresult',
		type: 'GET',
		data: { name: quizname, login: email, id: options.id },
		headers: {
			Authorization: 'Bearer ' + authToken
		},
		success: function (data, textStatus, jqXHR)
		{
			//if (jqXHR.status !== "204") {
			// quiz was taken at least one time
			var retakeInfo = JSON.parse(data);

			quiz.numOfRetake = parseInt(retakeInfo.NumOfRetake);
			quiz.mark = parseFloat(retakeInfo.FinalMark); // mark of the last quiz

			if (CanRetake(true)) {
				quiz.numOfRetake++;
				if (options.needLogin && options.saveSession) {
					GetLastSession();
				}
				else {
					StartQuizNow();
				}
			}
			else {
				EnsureMessageBoxVisibility();
				PrintWarning('Quiz già svolto', 'I');
			}
			//}
		},
		error: function (xhr, textStatus, errorThrown)
		{
			if (xhr.status === 404) // not found, quiz never taken
			{
				quiz.numOfRetake++;
				if (options.needLogin && options.saveSession) {
					GetLastSession();
				}
				else {
					StartQuizNow();
				}
			}
			else
			{
				EnsureMessageBoxVisibility();
				PrintError('Server error : ' + xhr.status + (errorThrown?(' - ' + errorThrown):''), 'I');
			}
		},
		complete: function (xhr, textStatus)
		{
			$('html').removeClass("wait");
			$('#loginBtnId').prop("disabled", false);
		}
	});
}

function StartQuizNow()
{
	quiz.dateStartQuiz = new Date();
	quiz.startTime = StartTime();

	if (quiz.currentUser.otherFields) {
		if (quiz.currentUser.otherFields.hasOwnProperty("extratime")) {
			quiz.extraTime = quiz.currentUser.otherFields.extratime;
		}
	}
	GoFirstPage('./pages/');
}

function EnsureMessageBoxVisibility()
{
	$('#loginPanelId').show();

	if (options.isQuizAnonymous)
	{
		$('#idFieldEmail').hide();
		$('#idFieldPassword').hide();
		$('#idFieldName').hide();
		$('#loginBtnId').hide();		
		$('#idRegistrationLink').hide();
		$('#loginPanelHeaderId').html("");

		PrintTitleAndDescription();
		PrintStatusBar();
		PrintCopyrightMsg();
	}
}