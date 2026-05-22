#!/bin/sh
set -e

echo "Running migrations..."
python manage.py makemigrations accounts cases documents audit notifications system
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Django development server..."
exec python manage.py runserver 0.0.0.0:8000
