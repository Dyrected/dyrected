import os
import re

EXCLUDED_WORDS = {
    "default", "ghost", "outline", "secondary", "destructive", "link", "icon",
    "sm", "md", "lg", "xl", "2xl", "top", "bottom", "left", "right",
    "expanded", "collapsed", "sidebar", "floating", "inset", "offcanvas", "none",
    "sidebar_state", "top-right", "asChild", "className", "variant", "size", "side",
    "true", "false", "item", "index", "key", "id", "name", "type", "value", "variant"
}

def prefix_single_class(c):
    if not c or c.startswith(("dy-", "{", "$", "--", "http")):
        return c
    
    if ":" in c:
        parts = c.split(":")
        modifiers = parts[:-1]
        base = parts[-1]
        
        new_modifiers = []
        for m in modifiers:
            if m.startswith(("group", "peer")):
                new_modifiers.append(f"dy-{m}")
            else:
                new_modifiers.append(m)
        
        if base and base not in EXCLUDED_WORDS and not base.startswith("["):
            base = f"dy-{base}"
            
        return ":".join(new_modifiers + [base])
    else:
        if c in EXCLUDED_WORDS or c.startswith("["):
            return c
        if c.startswith(("group", "peer")):
            return f"dy-{c}"
        return f"dy-{c}"

def prefix_classes_in_string(s):
    if not s: return s
    return " ".join([prefix_single_class(c) for c in s.split()])

def process_content(content):
    # 1. className="literal"
    def class_name_replacer(m):
        quote = m.group(1)
        classes = m.group(2)
        return f'className={quote}{prefix_classes_in_string(classes)}{quote}'
    content = re.sub(r'className=([\'"])(.*?)\1', class_name_replacer, content)
    
    # 2. cn(...)
    def cn_replacer(m):
        inner = m.group(1)
        def inner_string_replacer(sm):
            quote = sm.group(1)
            s = sm.group(2)
            preceding = inner[:sm.start()]
            # Only exclude if it's a comparison or arrow function
            if preceding.strip().endswith(("===", "!==", "==", "!=", "=>")):
                return sm.group(0)
            
            return f'{quote}{prefix_classes_in_string(s)}{quote}'
        new_inner = re.sub(r'([\'"])(.*?)\1', inner_string_replacer, inner)
        return f'cn({new_inner})'
    content = re.sub(r'cn\((.*?)\)', cn_replacer, content, flags=re.DOTALL)
    
    # 3. cva(...)
    def cva_replacer(m):
        inner = m.group(1)
        def cva_string_replacer(sm):
            quote = sm.group(1)
            s = sm.group(2)
            following = inner[sm.end():]
            if following.strip().startswith(":"):
                return sm.group(0)
            return f'{quote}{prefix_classes_in_string(s)}{quote}'
        new_inner = re.sub(r'([\'"])(.*?)\1', cva_string_replacer, inner)
        return f'cva({new_inner})'
    content = re.sub(r'cva\((.*?)\)', cva_replacer, content, flags=re.DOTALL)
    
    return content

def main():
    src_dir = "packages/admin/src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".tsx", ".ts")):
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
