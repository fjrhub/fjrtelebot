START_CMD="pnpm run dev"

echo "[$(date +'%H:%M:%S')] Starting Telegram bot..."
$START_CMD &
PID=$!

while true; do
    echo "[$(date +'%H:%M:%S')] Waiting 6 hours before checking for updates..."
    for i in $(seq 1 21600); do
        sleep 1
        if [ -f restart.flag ]; then
            echo "[$(date +'%H:%M:%S')] Manual restart triggered!"
            rm -f restart.flag

            kill -2 $PID
            wait $PID 2>/dev/null

            git pull

            echo "[$(date +'%H:%M:%S')] Restarting Telegram bot..."
            $START_CMD &
            PID=$!
        fi
    done

    echo "[$(date +'%H:%M:%S')] Checking remote Git repository..."
    git fetch

    if git diff --quiet HEAD origin/main; then
        echo "[$(date +'%H:%M:%S')] No updates found. Bot keeps running."
    else
        echo "[$(date +'%H:%M:%S')] Update detected! Restarting bot..."

        kill -2 $PID
        wait $PID 2>/dev/null

        git pull

        echo "[$(date +'%H:%M:%S')] Restarting Telegram bot..."
        $START_CMD &
        PID=$!
    fi

    echo "[$(date +'%H:%M:%S')] Check complete. Waiting for next cycle..."
done
