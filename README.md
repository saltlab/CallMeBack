CallMeBack
==========

This is a project to measure various features of JavaScript callbacks.

You can find more information on the study that we carried out using this project, see the [study website](http://www.ece.ubc.ca/~kgallaba/callback-study/).

At the moment you can use the codebase to study a set of particular JavaScript project repositories in our study. See instructions below on how to study another JavaScript project/repository.

### Setup instructions

- Install Node.js. You can find the instructions [here](https://github.com/joyent/node/wiki/Installation).
- Install dependencies. `npm install`
- Github repository URLs for projects are listed in the files `top_*.txt` in the `stats` directory seperated by application category. You can clone these all at once by executing `stats/gitclone.sh`
- Now you can run the tool to calculate the various callback statistics by executing `stats/get_stats.sh`. Make sure to supply the required `-t` argument followed by a single letter specifying the application category to analyze:
    - d : Dataviz
    - e : Game engines
    - f : MVC frameworks
    - g : Games
    - h : Web applications
    - n : NPM modules.

### Studying other JavaScript projects/repositories

*TODO*
