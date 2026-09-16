#!/bin/zsh
set -e
cd -- "${0:A:h}"
npm run setup
npm run dev:local
open 'http://127.0.0.1:5173'
