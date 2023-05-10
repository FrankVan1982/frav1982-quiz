//=========================================
// File name: page_index.js
//-----------------------------------------
// Project : QuizFaber 4.1.9
// Licence : GNU General Public License v3.0
// Author  : Luca Galli
// Email   : info@quizfaber.com
//-----------------------------------------
// Functions included in this file:
// - ready()
// - on beforeunload
//=========================================

$(document).ready(function () {
    PageLoadIndex();
});

$(window).on("beforeunload", function () {
    PageUnloadIndex();
});



