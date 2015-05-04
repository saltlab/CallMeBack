# Guide for the dataset

Data records are seperated into files according to the category of applications and the property being calculated. Suffix in the file name represent the category.
- dataviz - Dataviz
- engines - Game Engines
- frameworks - MVC Frameworks
- games - Games
- webapps - Web Applications
- npm - NPM Modules.

For example `callback_defs_dataviz.csv` contains results for function definitions accepting callbacks for DataViz category.

## Legend for tables
- Function definitions accepting callbacks - Files with prefix `callback_defs_`.
    - **Field1:** Project name
    - **Field2:** No. of function definitions accepting callbacks
    - **Field3:** No. of total function definitions

- Function usages (callsites) accepting callbacks - Files with prefix `callback_usage_`.
    - **Field1:** Project name
    - **Field2:** No. of function callsites accepting callbacks
    - **Field3:** No. of total function callsites

- Function usages with anonymous callbacks - Files with prefix `cb_anon_`.
    - **Field1:** Project name
    - **Field2:** No. of function callsites accepting anonymous callbacks

- Function usages with asynchronous callbacks - Files with prefix `cbasync_callsites_`.
    - **Field1:** Project name
    - **Field2:** No. of function callsites accepting asynchronous callbacks

- Function usages with asynchronous callbacks - Files with prefix `cbasync_callsites_`.
    - **Field1:** Project name
    - **Field2:** No. of function callsites accepting asynchronous callbacks

- Promise creation and Promise usage - Files with prefix `promises_`.
    - **Field1:** Project name
    - **Field2:** No. of instances using Promises
    - **Field3:** No. of instances creating Promises

- General Information about each file - Files with prefix `file_`
     - **Field List:** "project","path","loc","functions","functionDecls","functionExprs","namedFuncExprs","calls","requires","defines","fsSyncs","fsAsyncs","setTimeouts","setIntervals","setImmediates","nextTicks","argscount","argsmax","paramscount","paramsmax"

- Dependency counts for each application category - Files with prefix `pkg_`.
