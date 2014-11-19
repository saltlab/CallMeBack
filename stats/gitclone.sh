#!/bin/sh
while read p; do
  git clone $p
done <~/dev/RoundTrace/stats/top_npm.txt
# done <~/dev/RoundTrace/stats/top_hybrid.txt