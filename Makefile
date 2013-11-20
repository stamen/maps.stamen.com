all: update-version

update-version:
	./version.sh *.html */*.html
