#!/usr/bin/env bash

# export display so firefox knows where to show
# since we are in headless mode
export DISPLAY=:99.0
export HOSTNAME=${HOSTNAME-localhost}

echo $HOSTNAME

function main {
  local code=0
  local help=\
"Usage: web [options]

Options:
  -h,  --help          Display this message
  -c,  --coverage      Collect coverage report"

  for i in "$@"; do
    case $i in
      -h|--help) echo "$help"; exit 1 ;;
      -c|--coverage) ENABLE_COVERAGE=y ;;
    esac
    shift
  done

  # start xdisplay
  Xvfb :99 -shmem -screen 0 1368x768x16 &

  # start window manager
  2>/dev/null 1>&2 fluxbox &

  # start vnc server
  x11vnc -shared -display :99 -bg -nopw -listen 0.0.0.0 -forever -logappend /var/log/x11vnc.log -xkb

  # start selenium
  2>/dev/null 1>&2 java -jar selenium.jar &

  # run tests
  ./get-features.sh | xargs npm start -- ; code=$?

  if [[ -n $ENABLE_COVERAGE ]]; then
    curl -o "coverage.json" $HOSTNAME/api/coverage/object
    npm run coverage
  fi

  exit $code
}

main "$@"
