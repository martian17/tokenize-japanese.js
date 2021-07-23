let MultiTrie = function(){
    let tree = [{},[]];
    this.tree = tree;
    //subtree leaf
    this.add = function(id,val){
        let subtree = tree;
        for(let i = 0; i < id.length; i++){
            let char = id[i];
            let siblings = subtree[0];
            if(!(char in siblings)){
                siblings[char] = [{},[]];
            }
            subtree = siblings[char];
        }
        subtree[1].push(val);
        //success
    }
    this.findAllPossibleMatches = function(str,start){
        //find the longest match and back track
        let subtree = tree;
        let matches = [];
        for(let i = start; i < str.length; i++){
            let char = str[i];
            let siblings = subtree[0];
            if(!(char in siblings)){
                break;//finally hit the longest word
            }
            subtree = siblings[char];
            if(subtree[1].length !== 0)matches.push(subtree[1]);
        }
        return matches;
    }
};



let JapaneseParser = function({
        rootPath=window.location.origin,
        DEBUG=false
    }={}){//argument will be set after the testing phase is done
    //some utility function
    let loadJson = async function(path){
        let response = await fetch(rootPath+path);
        return await response.json();
    };
    let getText = async function(path){
        let response = await fetch(rootPath+path);
        return await response.text();
    };
    let Word = function(attr){
        this.word = attr[0];
        this.category = attr.slice(4,7).join(",");
        this.origin = attr;
    };
    
    
    let grammar;
    let multiTrie;
    let that = this;
    let init = async function(){
        //this can be improved using more promises and more concurrent optimization
        //loading the grammar
        console.log("loading grammar.json");
        grammar = await loadJson("/grammar.json");
        console.log("grammar.json loaded");
        //loading the dict
        console.log("loading dict.csv");
        let dictstr = await getText("/dict.csv");
        console.log("dict.csv loaded");
        console.log("splitting dictstr");
        let csv = (dictstr).split("\n");
        console.log("split dictstr completed");
        console.log("construcing the trie");
        multiTrie = new MultiTrie();
        that.trie = multiTrie;
        for(let i = 0; i < csv.length; i++){
            let line = csv[i];
            let word = new Word(line.split(","));
            multiTrie.add(word.word,word);
        }
        console.log("trie construction complete");
    };
    
    
    //okay, finally! this is where the fun begins
    let findNextWord = function(str,pointer,previousCategory){
        let matches = multiTrie.findAllPossibleMatches(str,pointer);
        if(DEBUG)console.log(matches);
        if(matches.length > 0){
            for(let i = matches.length-1; i >= 0; i--){
                let possibilities = matches[i];
                for(let j = 0; j < possibilities.length; j++){
                    let word = possibilities[j];
                    if(word.category in grammar[previousCategory]){
                        return word;
                    }
                }
            }
            //no matches found within the known grammar, returning the longest match
            return matches[matches.length-1][0];
        }else{
            //no matches found, treating it as a noun
            let ww = str[pointer];
            for(let i = pointer+1; i < str.length; i++){
                let matches = multiTrie.findAllPossibleMatches(str,i);
                if(matches.length > 0){
                    //found a word ending
                    //仕舞い,1285,1285,5543,名詞,一般,*,*,*,*,仕舞い,シマイ,シマイ
                    return new Word([ww,0,0,0,"名詞","一般","*","*","*","*",ww,ww,ww]);
                }
                ww += str[i];
            }
            return new Word([ww,0,0,0,"名詞","一般","*","*","*","*",ww,ww,ww]);
        }
    };
    
    this.tokenize = function(str){
        let result = [];
        let pointer = 0;
        let previousCategory = "記号,句点,*";
        while(pointer < str.length){
            let word = findNextWord(str,pointer,previousCategory);
            if(DEBUG)console.log(word);
            result.push(word);
            previousCategory = word.category;
            pointer += word.word.length;
        }
        return result;
    };
    
    
    
    
    
    //lastly, do some loading action since this library ain't gonna be ready unril every json and csv files load up
    let loadResolver = ()=>{};
    let loaded = false;
    this.waitLoad = function(){
        return new Promise((res,rej)=>{
            if(loaded){
                res();
            }else{
                loadResolver = res;
            }
        });
    };
    
    init().then(()=>{
        loaded = true;
        loadResolver();
    });
};