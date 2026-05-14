import os
import re

def prefix_classes_in_string(s):
    # Skip empty strings or strings that already have the prefix
    if not s or s.startswith("dy-"):
        return s
    
    # Split by whitespace, prefix each class, then rejoin
    classes = s.split()
    prefixed = []
    for c in classes:
        # Skip variables like {className} or strings that look like CSS variables
        if c.startswith("{") or c.startswith("$") or c.startswith("--"):
            prefixed.append(c)
        # Skip already prefixed
        elif c.startswith("dy-"):
            prefixed.append(c)
        # Prefix everything else (assuming they are tailwind classes)
        else:
            prefixed.append(f"dy-{c}")
    return " ".join(prefixed)

def process_content(content):
    # 1. Handle className="literal classes"
    content = re.sub(r'className=([\'"])(.*?)\1', 
                    lambda m: f'className={m.group(1)}{prefix_classes_in_string(m.group(2))}{m.group(1)}', 
                    content)
    
    # 2. Handle className={cn("literal classes", ...)}
    # We look for strings inside cn(...)
    def cn_match(m):
        # This is a bit rough but works for simple cn calls
        inner = m.group(1)
        # Replace string literals inside the cn call
        new_inner = re.sub(r'([\'"])(.*?)\1', 
                          lambda sm: f'{sm.group(1)}{prefix_classes_in_string(sm.group(2))}{sm.group(1)}', 
                          inner)
        return f'cn({new_inner})'
    
    content = re.sub(r'cn\((.*?)\)', cn_match, content, flags=re.DOTALL)
    
    # 3. Handle @apply in CSS
    content = re.sub(r'@apply (.*?);', 
                    lambda m: f'@apply {prefix_classes_in_string(m.group(1))};', 
                    content)
    
    return content

def main():
    src_dir = "packages/admin/src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".tsx", ".ts", ".css")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                new_content = process_content(content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")

if __name__ == "__main__":
    main()
