# Changelog

## [2.0.0](https://www.github.com/gulpjs/ordered-read-streams/compare/v1.0.1...v2.0.0) (2022-10-10)


### ⚠ BREAKING CHANGES

* Avoid eagerly reading streams
* Destroy all streams correctly when another is destroyed
* Switch to streamx (#27)
* Normalize repository, dropping node <10.13 support (#25)

### Features

* Avoid eagerly reading streams ([edb9aa1](https://www.github.com/gulpjs/ordered-read-streams/commit/edb9aa1e1937e6be80ec022aa56ff21817eb7515))
* Ensure readable does not end until read from ([87c871c](https://www.github.com/gulpjs/ordered-read-streams/commit/87c871ceacc3d2319756ee3a2683499831f6c7ee))
* Provide addSource function on the OrderedReadable stream ([#28](https://www.github.com/gulpjs/ordered-read-streams/issues/28)) ([87c871c](https://www.github.com/gulpjs/ordered-read-streams/commit/87c871ceacc3d2319756ee3a2683499831f6c7ee))
* Switch to streamx ([#27](https://www.github.com/gulpjs/ordered-read-streams/issues/27)) ([edb9aa1](https://www.github.com/gulpjs/ordered-read-streams/commit/edb9aa1e1937e6be80ec022aa56ff21817eb7515))


### Bug Fixes

* Destroy all streams correctly when another is destroyed ([edb9aa1](https://www.github.com/gulpjs/ordered-read-streams/commit/edb9aa1e1937e6be80ec022aa56ff21817eb7515))


### Miscellaneous Chores

* Normalize repository, dropping node <10.13 support ([#25](https://www.github.com/gulpjs/ordered-read-streams/issues/25)) ([f6e5671](https://www.github.com/gulpjs/ordered-read-streams/commit/f6e5671d67ddb67c8efce46805419e83ea07cde5))
