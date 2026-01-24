# [1.1.0](https://github.com/Redm0nd/lotg-exams/compare/v1.0.0...v1.1.0) (2026-01-24)


### Features

* **auth:** add Auth0 authentication to frontend ([78ae3e2](https://github.com/Redm0nd/lotg-exams/commit/78ae3e2ebd1b61b5c8b1f21574573b2fe776a980))

# 1.0.0 (2026-01-23)


### Bug Fixes

* **ci:** add missing publish_quiz output and null checks for all Lambda updates ([c5dca7d](https://github.com/Redm0nd/lotg-exams/commit/c5dca7d9f38d6d174c3d6fc0b2c6e245c57f4774))
* **ci:** add null checks for new Lambda function updates ([51c9196](https://github.com/Redm0nd/lotg-exams/commit/51c91968ee91432b96be84e45f302db2c3c2c84e))
* **ci:** build backend before terraform to prevent missing zip errors ([de6fde7](https://github.com/Redm0nd/lotg-exams/commit/de6fde7525170dc062593b5bcffbfae97354cd14))
* **ci:** update frontend lock file and skip husky hooks in CI ([d7c1e3f](https://github.com/Redm0nd/lotg-exams/commit/d7c1e3f2a6ff1d3c274ff9d4a92350e129d957cf))
* implement real submit answers API to fix quiz results ([0197b43](https://github.com/Redm0nd/lotg-exams/commit/0197b430cd29e1274708aee2b1577df818850ea6))
* update frontend lock file for react-dropzone ([30a1524](https://github.com/Redm0nd/lotg-exams/commit/30a1524f4b8068720c66b5762475902bad1621f4))


### Features

* add manual quiz creation and enhanced metadata tracking ([538ffab](https://github.com/Redm0nd/lotg-exams/commit/538ffabb2bd0674b1e3e90bbed32a43f63a733a5))
* **backend:** add quiz publishing functionality ([a6a4288](https://github.com/Redm0nd/lotg-exams/commit/a6a42880ee18025511bb0ea6ccd0e9be35f6428d))
* **backend:** connect quizzes to extraction jobs ([1c84b62](https://github.com/Redm0nd/lotg-exams/commit/1c84b62ae72514329a1451adb70a41606586a478))
* **devex:** add semantic commits, releases, and code formatting ([500d2a5](https://github.com/Redm0nd/lotg-exams/commit/500d2a5f2827ae6f3f9b3a8332df2eae38c4fd6a))
* **frontend:** add publish quiz UI ([16738e3](https://github.com/Redm0nd/lotg-exams/commit/16738e3538f45849a57ddd852ec53c7f70097579))
* **infra:** add infrastructure for quiz publishing ([a44ede3](https://github.com/Redm0nd/lotg-exams/commit/a44ede306a209197ee101ad1f8b2ba0ccb44994b))


### Performance Improvements

* using dorny/paths-filter to only apply tf when infra changes and app when app changes ([719b650](https://github.com/Redm0nd/lotg-exams/commit/719b650987bd9482b26a0c1d859b5d451bb5dfbf))
