#!/bin/sh
while read p; do
  git clone $p
# done <~/dev/RoundTrace/graph/top_modules.txt
done <~/dev/RoundTrace/graph/top_hybrid.txt