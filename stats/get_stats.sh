#!/bin/sh

case $1 in
    h)    type="hybrid";;
    n)    type="npm";;
    f)    type="frameworks";;
    d)    type="dataviz";;
    g)    type="games";;
    e)    type="engines";;
    ?)    printf "Usage: %s: [-h] [-n] [-f] [-d] [-g] [-e]\n" $0
          exit 2;;
esac

#dir_path="$HOME/dev/RoundTrace/stats/top_${type}.txt"
sources_path="$HOME/dev/top_${type}"

if [ -d $sources_path ]; then
    echo "$sources_path exists."
    cd $sources_path
    for d in */ ; do
    node /Users/keheliya/dev/RoundTrace/stats/stats_usage.js "$d"
#    echo "$d"
    #node /Users/keheliya/dev/RoundTrace/stats/stats_dir.js "$d"
    #cd "$d"
    #npm install
    #cd ..
    done
else
    echo "$sources_path does not exist"
fi

#if [ -d $sources_path ]; then
#    echo "$sources_path exists. so skipping the rest"
#else
#    echo "$sources_path does not exist. creating."
#    mkdir $sources_path
#    cd $sources_path
#    echo "Reading URLs from file $dir_path"
#    while read p; do
#        git clone $p
#    done <$dir_path
#fi
