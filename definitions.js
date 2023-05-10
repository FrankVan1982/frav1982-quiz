//=========================================
// File name: definitions.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

class Login
{
	constructor(id, name, email, hashPassword, role) {
		this.id = id;
		this.name = name;
		this.email = email;
		this.password = hashPassword;
		this.role = role;
		this.isEnabled = 1;
		this.authToken = null;
		this.sessionId = null;
		this.otherFields = null;
	}
}

class Quiz
{
	constructor(id, name, title, author, argument, season, state, link, dateCreated, dateModified, duration) {
		this.Id = id;
		this.Name = name;
		this.Title = title;
		this.Author = author;
		this.Argument = argument;
		this.Season = season;
		this.State = state;
		this.IntroText = "";
		this.EpiText = "";
		this.NumQuestions = 0;
		this.Link = link;
		this.DateCreated = dateCreated;
		this.DateModified = dateModified;
		this.Duration = duration;
	}
}

class ResultItem {
	constructor() {
		this.Id = 0;
		this.TypeOfQuest = 0;
		this.QuestNum = 0;
		this.Weight = 1;
		this.SelectedAnswers = null;
		this.CorrectedAnswers = null;
		//this.Response = response;
		this.ShortTextQuestion = '';
		this.Valid = 0;
		this.Points = 0;
		this.Score = 0;
		this.MinScore = 0;
		this.MaxScore = 0;
		this.Feedback = "";
		this.IsCancelled = null;
		this.ModuleInfo = "";
	}
}

class ResultAnswerItem {
	constructor() {
		this.Id = 0;
		this.IdResultQuestion = 0;
		this.AnswerNum = 0;
		this.Choice = null;
		this.Valuation = null;
		this.IsGuess = false;
		this.Score = 0;
		this.AdditionalText = null;
		this.ShortTextAnswer = null;
		this.ShortTextRemark = null;
	}
}

class ResultHeader {
	constructor() {
		this.Name;
		this.Title;
		this.Author;
		this.Argument;
		this.Duration;
		this.NumOfQuestions;
	}
}

class Result {
	constructor() {
		this.Id;
		this.UserName;
		this.UserLogin;
		this.UserInfo;
		this.DateCompleted;
		this.DateReceived;
		this.ElapsedTime;
		this.HighestMark;
		this.NumCorrectAnswers;
		this.NumWrongAnswers;
		this.NumNotValutated;
		this.NumNotAnswered;
		this.NumOfRetake;
		this.FinalMark;
		this.FinalPoints;
		this.ReviewMark;
		this.ReviewPoints;
		this.ReviewDate;
		this.LowestMark;
		this.RoundMark;
		this.IsDuplicated;
		this.Answers = [];
		this.Header = null;
	}
}

class Abstract {
	constructor(id, title, user, date, dateStr, mark, points, isDuplicated) {
		this.ID = id;
		this.Title = title;
		this.User = user;
		this.Date = date;
		this.DateStr = dateStr;
		this.Mark = mark;
		this.Points = points;
		this.IsDuplicated = isDuplicated;
	}
}

class SearchParams {
	constructor(title, user, fromDate, toDate, fromMark, toMark, top, last, incDup, orderby) {
		this.Names = [];
		this.Title = title;
		this.User = user;
		this.FromDate = fromDate;
		this.ToDate = toDate;
		this.FromMark = fromMark;
		this.ToMark = toMark;
		this.Top = top;  // numero di record
		this.Last = last; // i risultati fino a 'last' minuti prima
		this.IncludeDup = incDup; // include duplicated results
		this.orderby = orderby;
	}
}

class RetakeInfo
{
	constructor(numOfRetake, finalMark)
	{
		this.NumOfRetake = numOfRetake;
		this.FinalMark = finalMark;
	}
}

class SessionInfo {
	constructor(personId) {
		this.PersonId = personId;
		this.SessionId = '';
		this.DateCreated = null;
		this.IpLogin = '';
		this.SessionData = null;
		this.DateLastUpdate = null;
		this.QuizId = 0;
		this.IpLogout = '';
		this.IsRecoverable = false;
	}
}

class PersonInfo {
	constructor(name, value, urlParam) {
		this.Name = name;
		this.Value = value;
		this.Param = urlParam;
	}
}

class Revision {
	constructor(report,origin,charset,language) {
		this.Report = report;
		this.Origin = origin;
		this.Charset = charset;
		this.Language = language;
	}
}

class Settings {
	constructor(dbVersion, serverVersion, environment, portalBaseUrl, phpMyAdminUrl, ownerUrl, footerText) {
		this.DbVersion = dbVersion;
		this.ServerVersion = serverVersion;
		this.Environment = environment;
		this.PortalBaseUrl = portalBaseUrl;
		this.PhpMyAdminUrl = phpMyAdminUrl;
		this.OwnerUrl = ownerUrl;
		this.FooterText = footerText;
	}
}

class Queue {

	constructor() { this.q = []; }
	send(item) { this.q.push(item); }
	receive() { return this.q.shift(); }
	length() { return this.q.length; }
	clear() { this.q = []; }
}

module.exports = { Login, Quiz, Abstract, ResultItem, ResultAnswerItem, ResultHeader, Result, SearchParams, RetakeInfo, SessionInfo, PersonInfo, Revision, Settings, Queue };
