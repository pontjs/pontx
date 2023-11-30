#!/bin/sh

comment_labels=("FIXME" "TODO" "DELETEME" "NOTE")
comment_labels_no_commit=("NOCOMMIT")
columns=$(tput cols)
CYAN=$'\e[36m'
NC=$'\e[m'

grep_wrapper() {
    grep "$@" -r -F -n --include=*.{jsx,js,tsx,ts} --exclude-dir={node_modules,lib,commonjs,services,built,tmp,services,out,dist,mocks,assets,es6,builtin}  --color=always
}

check_comments() {
    label_type="$1"
    labels=("${@:2}")
    echo "\n"
    printf "%0${columns}d\n" 0 | tr 0 -
    echo "Comment label type: ${CYAN}${label_type}${NC}"
    echo "Comment label(s): ${CYAN}${labels[*]}${NC}\n\n"
    should_not_commit=false

    for label in "${labels[@]}"; do
        results=$(grep_wrapper "$label")
        grep_status="$?"
        if [[ "$grep_status" = 0 && "$label_type" = "NOCOMMIT" ]]; then
            should_not_commit=true
        fi

        if [[ "$grep_status" = 0 ]]; then
            count=$(wc -l <<< "$results")
            echo "\nFound ${CYAN}${label}${NC} comment label ${CYAN}${count}${NC} time(s)"
            echo "$results"
			exit 1
        else
            echo "\nNo matches found for: ${CYAN}${label}${NC}\n"
        fi
    done

    if [[ "$should_not_commit" = true ]]; then
        echo "There were NOCOMMIT comment labels matched\n\n"
        exit 0
    fi
}

check_comments "COMMIT" "${comment_labels[@]}"
check_comments "NOCOMMIT" "${comment_labels_no_commit[@]}"
