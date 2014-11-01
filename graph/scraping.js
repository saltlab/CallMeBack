var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');

var url = 'https://www.npmjs.org/browse/depended';
var pkgs = [];
request(url, function(err, resp, body) {
    if (err)
        throw err;
    var $ = cheerio.load(body);
    $('\#package \> div.row').each(function(i, elem) {
        //console.log($(this).html());
        $(this).find('p a').each(function() {
            var s = ($(this).text());
            var new_url = 'https://www.npmjs.org/package/'+s;
            console.log(new_url);
            request(new_url, function(err, resp, body) {
                var $ = cheerio.load(body);
                $('\#package .metadata tr td').each(function(i, elem) {
                    if(i==5){
                        var repo_url = $(this).find('a').text().trim();
                        if(repo_url.indexOf('github') >= 0){
                            if(repo_url.indexOf('issues') >= 0){
                                    repo_url = repo_url.substring(0,repo_url.indexOf('issues'));
                            }
                            fs.appendFile('top_modules.txt', repo_url+'\n', function (err) {

                            });
                        }
                    }
                });

            });
        });
    });

});

