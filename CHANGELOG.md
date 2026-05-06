# [1.13.0](https://github.com/Redm0nd/lotg-exams/compare/v1.12.1...v1.13.0) (2026-05-06)


### Features

* **landing:** live sample question + scroll-reveal sections ([5196f69](https://github.com/Redm0nd/lotg-exams/commit/5196f69f11bc9e037e597358c2b428d58cf62f2d))

## [1.12.1](https://github.com/Redm0nd/lotg-exams/compare/v1.12.0...v1.12.1) (2026-05-06)


### Bug Fixes

* **backend:** sync package-lock.json so npm ci passes ([7572f03](https://github.com/Redm0nd/lotg-exams/commit/7572f03d41c040ec2c2fbd25327d3ff07ee8fbdc))

# [1.12.0](https://github.com/Redm0nd/lotg-exams/compare/v1.11.0...v1.12.0) (2026-05-06)


### Features

* **landing:** add hero and value props above the quiz list ([7a5b599](https://github.com/Redm0nd/lotg-exams/commit/7a5b59994c425ecf15a145a8bfd6039e8542e793)), closes [#51](https://github.com/Redm0nd/lotg-exams/issues/51)

# [1.11.0](https://github.com/Redm0nd/lotg-exams/compare/v1.10.1...v1.11.0) (2026-05-04)


### Features

* add study mode with instant feedback after each question ([02a9ead](https://github.com/Redm0nd/lotg-exams/commit/02a9ead9083ebbcbb5dae6e4763e168e31a1b023)), closes [#57](https://github.com/Redm0nd/lotg-exams/issues/57)

## [1.10.1](https://github.com/Redm0nd/lotg-exams/compare/v1.10.0...v1.10.1) (2026-05-04)


### Bug Fixes

* include published and metadata fields in jobs endpoint response ([f9fe34d](https://github.com/Redm0nd/lotg-exams/commit/f9fe34d5d99d85cadb8af34e4b3a95100516f315))

# [1.10.0](https://github.com/Redm0nd/lotg-exams/compare/v1.9.1...v1.10.0) (2026-05-04)


### Features

* **admin:** add Manage Quizzes section with edit, add/remove questions ([ac5da41](https://github.com/Redm0nd/lotg-exams/commit/ac5da41c5dc53102bdb94359bccd12fb9dfd1592)), closes [#61](https://github.com/Redm0nd/lotg-exams/issues/61)

## [1.9.1](https://github.com/Redm0nd/lotg-exams/compare/v1.9.0...v1.9.1) (2026-05-04)


### Bug Fixes

* return isPublic flag from getQuiz endpoint ([cf6e4ac](https://github.com/Redm0nd/lotg-exams/commit/cf6e4ac2ddec77cae74a47d9f5c81d83da6a3ed3))

# [1.9.0](https://github.com/Redm0nd/lotg-exams/compare/v1.8.3...v1.9.0) (2026-05-04)


### Features

* shuffle MCQ options on each quiz attempt ([bb25828](https://github.com/Redm0nd/lotg-exams/commit/bb258286a5e245513f15d7a56a7662bade86a37d)), closes [#49](https://github.com/Redm0nd/lotg-exams/issues/49)

## [1.8.3](https://github.com/Redm0nd/lotg-exams/compare/v1.8.2...v1.8.3) (2026-05-04)


### Bug Fixes

* enforce isPublic access control on backend quiz endpoints ([b95cd20](https://github.com/Redm0nd/lotg-exams/commit/b95cd2037826e7c2ef22fa31c85c88b1e2e9de43)), closes [#50](https://github.com/Redm0nd/lotg-exams/issues/50)

## [1.8.2](https://github.com/Redm0nd/lotg-exams/compare/v1.8.1...v1.8.2) (2026-05-04)


### Bug Fixes

* improve locked quiz UX and change MCQ labels to A-D ([4e8d3ba](https://github.com/Redm0nd/lotg-exams/commit/4e8d3bab2dd0744088c9ab95d8195899400460d0))

## [1.8.1](https://github.com/Redm0nd/lotg-exams/compare/v1.8.0...v1.8.1) (2026-05-03)


### Bug Fixes

* allow same question to be added to multiple quizzes ([8d2a93e](https://github.com/Redm0nd/lotg-exams/commit/8d2a93e11097771d2e0ad47a7c7bcdd52e46b0c0))

# [1.8.0](https://github.com/Redm0nd/lotg-exams/compare/v1.7.0...v1.8.0) (2026-05-03)


### Features

* add isPublic flag for freemium quiz access ([e03dec5](https://github.com/Redm0nd/lotg-exams/commit/e03dec573c5467a4cf876bfd912ab7305a3df9e2)), closes [#10](https://github.com/Redm0nd/lotg-exams/issues/10)

# [1.7.0](https://github.com/Redm0nd/lotg-exams/compare/v1.6.5...v1.7.0) (2026-05-03)


### Features

* **admin:** add question picker step to CreateQuiz ([b6a0dbf](https://github.com/Redm0nd/lotg-exams/commit/b6a0dbf3e1298277c9a1482dc5199333f47212f4)), closes [#14](https://github.com/Redm0nd/lotg-exams/issues/14)

## [1.6.5](https://github.com/Redm0nd/lotg-exams/compare/v1.6.4...v1.6.5) (2026-05-03)


### Bug Fixes

* use ID token instead of access token for admin API auth ([a1587d3](https://github.com/Redm0nd/lotg-exams/commit/a1587d356bcba5a5af19b1205b5c2f627f4b98de))

## [1.6.4](https://github.com/Redm0nd/lotg-exams/compare/v1.6.3...v1.6.4) (2026-05-03)


### Bug Fixes

* remove Auth0 audience requirement (no API registered in Auth0) ([9651c49](https://github.com/Redm0nd/lotg-exams/commit/9651c49a31013edc70bd54f2f7ab818924cf17a7))

## [1.6.3](https://github.com/Redm0nd/lotg-exams/compare/v1.6.2...v1.6.3) (2026-05-03)


### Bug Fixes

* add Auth0 audience to fix admin endpoint 404s ([eac06eb](https://github.com/Redm0nd/lotg-exams/commit/eac06eb840a7d22a8a540c8b1f7f99336697ba4d))

## [1.6.2](https://github.com/Redm0nd/lotg-exams/compare/v1.6.1...v1.6.2) (2026-05-03)


### Bug Fixes

* **deploy:** eliminate SPA stale-asset race in frontend deploy ([a0c6d1a](https://github.com/Redm0nd/lotg-exams/commit/a0c6d1a0f602f13d263020f843a4172e8c9b323b))

## [1.6.1](https://github.com/Redm0nd/lotg-exams/compare/v1.6.0...v1.6.1) (2026-05-03)


### Bug Fixes

* **auth:** diagnostic logging on authorizer + ship through deploy-backend ([4f49662](https://github.com/Redm0nd/lotg-exams/commit/4f49662d2741cde0499057fe4c02b84802ec080f)), closes [#33](https://github.com/Redm0nd/lotg-exams/issues/33)

# [1.6.0](https://github.com/Redm0nd/lotg-exams/compare/v1.5.2...v1.6.0) (2026-05-02)


### Features

* **quiz:** time limits, law filter, and per-quiz question count ([7540688](https://github.com/Redm0nd/lotg-exams/commit/75406882ef1abe386289fc716ef9c47aa49c7b14)), closes [#14](https://github.com/Redm0nd/lotg-exams/issues/14) [#14](https://github.com/Redm0nd/lotg-exams/issues/14)

## [1.5.2](https://github.com/Redm0nd/lotg-exams/compare/v1.5.1...v1.5.2) (2026-05-02)


### Bug Fixes

* **infra:** attach CORS headers to API Gateway error responses ([855b5c5](https://github.com/Redm0nd/lotg-exams/commit/855b5c5ea657ff9396ff1d1d36bdc7d50aba0110))

## [1.5.1](https://github.com/Redm0nd/lotg-exams/compare/v1.5.0...v1.5.1) (2026-05-02)


### Bug Fixes

* **frontend:** trigger fresh deployment to resolve stale asset mismatch ([4f0703c](https://github.com/Redm0nd/lotg-exams/commit/4f0703cb2ed0d9fc30bdb5065e8998e2eeaba584))

# [1.5.0](https://github.com/Redm0nd/lotg-exams/compare/v1.4.1...v1.5.0) (2026-05-02)


### Features

* **quiz-list:** add search, category filter, and result count ([7b80662](https://github.com/Redm0nd/lotg-exams/commit/7b806626e07302f5717e6b6612b09ea31030470b))
* **quiz-results:** show duration, review-wrong toggle, respect reduced motion ([4c29baa](https://github.com/Redm0nd/lotg-exams/commit/4c29baaebacc94a9a221fcd994371ee5e519a4eb))
* **quiz-take:** add keyboard shortcuts for answering and navigation ([8e77d0b](https://github.com/Redm0nd/lotg-exams/commit/8e77d0b0a7aad6222ca17128c66c0917cf87cc12))

## [1.4.1](https://github.com/Redm0nd/lotg-exams/compare/v1.4.0...v1.4.1) (2026-05-02)


### Bug Fixes

* **quiz:** shorten confetti celebration on high scores ([638d593](https://github.com/Redm0nd/lotg-exams/commit/638d593a49f385b38995ce47a7369288500c6f85))

# [1.4.0](https://github.com/Redm0nd/lotg-exams/compare/v1.3.1...v1.4.0) (2026-01-25)


### Features

* **auth:** add API Gateway JWT authorizer for admin routes ([921bddd](https://github.com/Redm0nd/lotg-exams/commit/921bddd399f8d42fcd55f37c75cf26089adbf91b)), closes [#9](https://github.com/Redm0nd/lotg-exams/issues/9)

## [1.3.1](https://github.com/Redm0nd/lotg-exams/compare/v1.3.0...v1.3.1) (2026-01-25)


### Bug Fixes

* **infra:** add 3-day retention to CloudWatch log groups ([219a23d](https://github.com/Redm0nd/lotg-exams/commit/219a23d189f01e7080aa3982fb96ca195cb23824))

# [1.3.0](https://github.com/Redm0nd/lotg-exams/compare/v1.2.0...v1.3.0) (2026-01-25)


### Features

* **quiz:** add confetti celebration on quiz results ([755e270](https://github.com/Redm0nd/lotg-exams/commit/755e270132d2e5f76b045b31a89566223164616a)), closes [#13](https://github.com/Redm0nd/lotg-exams/issues/13)

# [1.2.0](https://github.com/Redm0nd/lotg-exams/compare/v1.1.2...v1.2.0) (2026-01-24)


### Features

* **auth:** add role-based access control for admin routes ([8427ee2](https://github.com/Redm0nd/lotg-exams/commit/8427ee28347078bbc1257b966dc281be966fffd2))

## [1.1.2](https://github.com/Redm0nd/lotg-exams/compare/v1.1.1...v1.1.2) (2026-01-24)


### Bug Fixes

* **auth:** improve Auth0 config validation message ([a0a983e](https://github.com/Redm0nd/lotg-exams/commit/a0a983e374c07bf81d33840866971a9335bf171b))

## [1.1.1](https://github.com/Redm0nd/lotg-exams/compare/v1.1.0...v1.1.1) (2026-01-24)


### Bug Fixes

* **ci:** add Auth0 environment variables to frontend build ([68e715d](https://github.com/Redm0nd/lotg-exams/commit/68e715d9301da15e568f07537c151421a60f2396))

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
