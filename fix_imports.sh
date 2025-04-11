#!/bin/bash
sed -i 's/\s*\/\/ Import the HuggingFace generator\n\s*const { generateBlogContentWithHF } = require("..\/services\/huggingface");//g' server/routes/content.ts
