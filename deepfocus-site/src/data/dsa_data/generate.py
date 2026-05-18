import json

patterns = [
    "Hashing",
    "Two Pointers",
    "Sliding Window",
    "Prefix Sum",
    "Binary Search",
    "Linked List",
    "Stack",
    "Monotonic Stack",
    "Trees",
    "Graphs",
    "Heap",
    "Dynamic Programming",
    "Greedy",
    "Backtracking",
    "Bit Manipulation",
    "Trie",
    "Union Find",
    "Topological Sort",
    "Segment Tree",
    "Sweep Line",
    "Intervals",
    "Math & Geometry"
]

pattern_priority = {
    "Hashing": 100,
    "Two Pointers": 98,
    "Sliding Window": 96,
    "Binary Search": 94,
    "Graphs": 92,
    "Trees": 90,
    "Dynamic Programming": 88,
    "Backtracking": 86,
    "Heap": 84,
    "Stack": 82,
    "Linked List": 80,
    "Greedy": 78,
    "Prefix Sum": 76,
    "Intervals": 74,
    "Monotonic Stack": 72,
    "Trie": 70,
    "Topological Sort": 68,
    "Union Find": 66,
    "Bit Manipulation": 64,
    "Sweep Line": 62,
    "Segment Tree": 60,
    "Math & Geometry": 58
}

pattern_alias_map = {
    "Hash Table": "Hashing",
    "HashMap": "Hashing",
    "HashSet": "Hashing",
    "Memoization": "Dynamic Programming",
    "DP": "Dynamic Programming",
    "DFS": "Graphs",
    "BFS": "Graphs",
    "Depth-First Search": "Graphs",
    "Breadth-First Search": "Graphs",
    "Window Sliding": "Sliding Window",
    "Priority Queue": "Heap",
    "Disjoint Set": "Union Find",
    "Math": "Math & Geometry",
    "Geometry": "Math & Geometry",
    "Binary Search Tree": "Trees",
    "BST": "Trees"
}

subpattern_filters = {
    "Hashing": ["Frequency Map", "Matrix Hashing", "String Hashing", "Anagrams"],
    "Two Pointers": ["Fast & Slow", "Opposite Direction", "Fixed Gap", "In-place Manipulation"],
    "Sliding Window": ["Fixed Size", "Variable Size", "Shrinkable", "Count Mappings"],
    "Binary Search": ["Search Space", "Rotated Array", "Matrix Search", "Lower/Upper Bound"],
    "Linked List": ["Reversal", "Cycle Detection", "Merge", "Dummy Node", "In-place Manipulation"],
    "Stack": ["String Parsing", "Valid Parentheses", "Calculator"],
    "Monotonic Stack": ["Next Greater", "Next Smaller", "Histogram"],
    "Trees": ["Traversal", "LCA", "BST Properties", "Root to Leaf Path", "Level Order", "Recursive"],
    "Graphs": ["Shortest Path", "Connected Components", "Matrix/Grid DFS", "Cycle Detection", "Bipartite"],
    "Heap": ["Top K", "K-way Merge", "Two Heaps"],
    "Dynamic Programming": ["1D DP", "2D DP", "0/1 Knapsack", "Unbounded Knapsack", "Fibonacci", "Longest Common Subsequence", "Palindromes", "Grid DP", "State Machine"],
    "Greedy": ["Optimal Choice", "Two Arrays", "Sorting"],
    "Backtracking": ["Permutations", "Combinations", "Subsets", "Matrix DFS"],
    "Bit Manipulation": ["XOR", "Bit Masking", "Shifting"],
    "Trie": ["Prefix Matching", "Word Search", "Bit Trie"],
    "Union Find": ["Connected Components", "Cycle Detection", "Path Compression"],
    "Topological Sort": ["Kahn's Algorithm", "Course Schedule", "Dependency Resolution"],
    "Segment Tree": ["Range Query", "Point Update", "Lazy Propagation"],
    "Sweep Line": ["Meeting Rooms", "Interval Overlaps", "Events Handling"],
    "Intervals": ["Merge", "Insert", "Overlap"],
    "Prefix Sum": ["Subarray Sum", "2D Prefix Sum", "Difference Array"],
    "Math & Geometry": ["Prime Numbers", "Modular Arithmetic", "Matrix Rotation"]
}

questions = [
    {
        "leetcode_id": 1,
        "title": "Two Sum",
        "difficulty": "Easy",
        "primary_pattern": "Hashing",
        "hidden_tags": ["Array", "Frequency Map"]
    },
    {
        "leetcode_id": 3,
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "Medium",
        "primary_pattern": "Sliding Window",
        "hidden_tags": ["Hashing", "Variable Size", "String"]
    },
    {
        "leetcode_id": 11,
        "title": "Container With Most Water",
        "difficulty": "Medium",
        "primary_pattern": "Two Pointers",
        "hidden_tags": ["Opposite Direction", "Greedy", "Array"]
    },
    {
        "leetcode_id": 15,
        "title": "3Sum",
        "difficulty": "Medium",
        "primary_pattern": "Two Pointers",
        "hidden_tags": ["Opposite Direction", "Sorting", "Array"]
    },
    {
        "leetcode_id": 20,
        "title": "Valid Parentheses",
        "difficulty": "Easy",
        "primary_pattern": "Stack",
        "hidden_tags": ["String Parsing", "String"]
    },
    {
        "leetcode_id": 21,
        "title": "Merge Two Sorted Lists",
        "difficulty": "Easy",
        "primary_pattern": "Linked List",
        "hidden_tags": ["Merge", "Dummy Node", "Recursive"]
    },
    {
        "leetcode_id": 23,
        "title": "Merge k Sorted Lists",
        "difficulty": "Hard",
        "primary_pattern": "Heap",
        "hidden_tags": ["K-way Merge", "Linked List", "Divide and Conquer"]
    },
    {
        "leetcode_id": 33,
        "title": "Search in Rotated Sorted Array",
        "difficulty": "Medium",
        "primary_pattern": "Binary Search",
        "hidden_tags": ["Rotated Array", "Array"]
    },
    {
        "leetcode_id": 39,
        "title": "Combination Sum",
        "difficulty": "Medium",
        "primary_pattern": "Backtracking",
        "hidden_tags": ["Combinations", "Recursive", "Array"]
    },
    {
        "leetcode_id": 42,
        "title": "Trapping Rain Water",
        "difficulty": "Hard",
        "primary_pattern": "Two Pointers",
        "hidden_tags": ["Opposite Direction", "Dynamic Programming", "Monotonic Stack", "Array"]
    },
    {
        "leetcode_id": 46,
        "title": "Permutations",
        "difficulty": "Medium",
        "primary_pattern": "Backtracking",
        "hidden_tags": ["Permutations", "Recursive", "Array"]
    },
    {
        "leetcode_id": 56,
        "title": "Merge Intervals",
        "difficulty": "Medium",
        "primary_pattern": "Intervals",
        "hidden_tags": ["Merge", "Sorting", "Array"]
    },
    {
        "leetcode_id": 57,
        "title": "Insert Interval",
        "difficulty": "Medium",
        "primary_pattern": "Intervals",
        "hidden_tags": ["Insert", "Array"]
    },
    {
        "leetcode_id": 76,
        "title": "Minimum Window Substring",
        "difficulty": "Hard",
        "primary_pattern": "Sliding Window",
        "hidden_tags": ["Variable Size", "Hashing", "String"]
    },
    {
        "leetcode_id": 79,
        "title": "Word Search",
        "difficulty": "Medium",
        "primary_pattern": "Backtracking",
        "hidden_tags": ["Matrix DFS", "String", "Matrix/Grid DFS"]
    },
    {
        "leetcode_id": 84,
        "title": "Largest Rectangle in Histogram",
        "difficulty": "Hard",
        "primary_pattern": "Monotonic Stack",
        "hidden_tags": ["Histogram", "Array"]
    },
    {
        "leetcode_id": 94,
        "title": "Binary Tree Inorder Traversal",
        "difficulty": "Easy",
        "primary_pattern": "Trees",
        "hidden_tags": ["Traversal", "Recursive", "Stack"]
    },
    {
        "leetcode_id": 104,
        "title": "Maximum Depth of Binary Tree",
        "difficulty": "Easy",
        "primary_pattern": "Trees",
        "hidden_tags": ["Traversal", "Recursive", "Depth-First Search"]
    },
    {
        "leetcode_id": 105,
        "title": "Construct Binary Tree from Preorder and Inorder Traversal",
        "difficulty": "Medium",
        "primary_pattern": "Trees",
        "hidden_tags": ["Recursive", "Array", "Hashing"]
    },
    {
        "leetcode_id": 121,
        "title": "Best Time to Buy and Sell Stock",
        "difficulty": "Easy",
        "primary_pattern": "Sliding Window",
        "hidden_tags": ["Variable Size", "Array", "Dynamic Programming"]
    },
    {
        "leetcode_id": 125,
        "title": "Valid Palindrome",
        "difficulty": "Easy",
        "primary_pattern": "Two Pointers",
        "hidden_tags": ["Opposite Direction", "String"]
    },
    {
        "leetcode_id": 127,
        "title": "Word Ladder",
        "difficulty": "Hard",
        "primary_pattern": "Graphs",
        "hidden_tags": ["Shortest Path", "Breadth-First Search", "Hashing", "String"]
    },
    {
        "leetcode_id": 128,
        "title": "Longest Consecutive Sequence",
        "difficulty": "Medium",
        "primary_pattern": "Hashing",
        "hidden_tags": ["HashSet", "Array", "Union Find"]
    },
    {
        "leetcode_id": 133,
        "title": "Clone Graph",
        "difficulty": "Medium",
        "primary_pattern": "Graphs",
        "hidden_tags": ["Depth-First Search", "Breadth-First Search", "Hashing"]
    },
    {
        "leetcode_id": 141,
        "title": "Linked List Cycle",
        "difficulty": "Easy",
        "primary_pattern": "Linked List",
        "hidden_tags": ["Cycle Detection", "Fast & Slow"]
    },
    {
        "leetcode_id": 146,
        "title": "LRU Cache",
        "difficulty": "Medium",
        "primary_pattern": "Linked List",
        "hidden_tags": ["Hashing", "Doubly-Linked List", "Design"]
    },
    {
        "leetcode_id": 152,
        "title": "Maximum Product Subarray",
        "difficulty": "Medium",
        "primary_pattern": "Dynamic Programming",
        "hidden_tags": ["1D DP", "Array"]
    },
    {
        "leetcode_id": 153,
        "title": "Find Minimum in Rotated Sorted Array",
        "difficulty": "Medium",
        "primary_pattern": "Binary Search",
        "hidden_tags": ["Rotated Array", "Array"]
    },
    {
        "leetcode_id": 200,
        "title": "Number of Islands",
        "difficulty": "Medium",
        "primary_pattern": "Graphs",
        "hidden_tags": ["Connected Components", "Matrix/Grid DFS", "Breadth-First Search"]
    },
    {
        "leetcode_id": 206,
        "title": "Reverse Linked List",
        "difficulty": "Easy",
        "primary_pattern": "Linked List",
        "hidden_tags": ["Reversal", "Recursive"]
    },
    {
        "leetcode_id": 207,
        "title": "Course Schedule",
        "difficulty": "Medium",
        "primary_pattern": "Topological Sort",
        "hidden_tags": ["Dependency Resolution", "Cycle Detection", "Graphs"]
    },
    {
        "leetcode_id": 208,
        "title": "Implement Trie (Prefix Tree)",
        "difficulty": "Medium",
        "primary_pattern": "Trie",
        "hidden_tags": ["Prefix Matching", "Design", "String"]
    },
    {
        "leetcode_id": 215,
        "title": "Kth Largest Element in an Array",
        "difficulty": "Medium",
        "primary_pattern": "Heap",
        "hidden_tags": ["Top K", "Array", "Divide and Conquer"]
    },
    {
        "leetcode_id": 226,
        "title": "Invert Binary Tree",
        "difficulty": "Easy",
        "primary_pattern": "Trees",
        "hidden_tags": ["Recursive", "Traversal"]
    },
    {
        "leetcode_id": 235,
        "title": "Lowest Common Ancestor of a Binary Search Tree",
        "difficulty": "Medium",
        "primary_pattern": "Trees",
        "hidden_tags": ["BST Properties", "LCA", "Recursive"]
    },
    {
        "leetcode_id": 239,
        "title": "Sliding Window Maximum",
        "difficulty": "Hard",
        "primary_pattern": "Monotonic Stack",
        "hidden_tags": ["Sliding Window", "Heap", "Array"]
    },
    {
        "leetcode_id": 253,
        "title": "Meeting Rooms II",
        "difficulty": "Medium",
        "primary_pattern": "Sweep Line",
        "hidden_tags": ["Events Handling", "Heap", "Sorting"]
    },
    {
        "leetcode_id": 268,
        "title": "Missing Number",
        "difficulty": "Easy",
        "primary_pattern": "Bit Manipulation",
        "hidden_tags": ["XOR", "Array", "Math"]
    },
    {
        "leetcode_id": 295,
        "title": "Find Median from Data Stream",
        "difficulty": "Hard",
        "primary_pattern": "Heap",
        "hidden_tags": ["Two Heaps", "Design", "Sorting"]
    },
    {
        "leetcode_id": 300,
        "title": "Longest Increasing Subsequence",
        "difficulty": "Medium",
        "primary_pattern": "Dynamic Programming",
        "hidden_tags": ["1D DP", "Binary Search", "Array"]
    },
    {
        "leetcode_id": 307,
        "title": "Range Sum Query - Mutable",
        "difficulty": "Medium",
        "primary_pattern": "Segment Tree",
        "hidden_tags": ["Range Query", "Point Update", "Design"]
    },
    {
        "leetcode_id": 322,
        "title": "Coin Change",
        "difficulty": "Medium",
        "primary_pattern": "Dynamic Programming",
        "hidden_tags": ["1D DP", "Unbounded Knapsack", "Array"]
    },
    {
        "leetcode_id": 338,
        "title": "Counting Bits",
        "difficulty": "Easy",
        "primary_pattern": "Dynamic Programming",
        "hidden_tags": ["Bit Manipulation", "1D DP", "Math"]
    },
    {
        "leetcode_id": 417,
        "title": "Pacific Atlantic Water Flow",
        "difficulty": "Medium",
        "primary_pattern": "Graphs",
        "hidden_tags": ["Matrix/Grid DFS", "Breadth-First Search"]
    },
    {
        "leetcode_id": 424,
        "title": "Longest Repeating Character Replacement",
        "difficulty": "Medium",
        "primary_pattern": "Sliding Window",
        "hidden_tags": ["Variable Size", "Hashing", "String"]
    },
    {
        "leetcode_id": 435,
        "title": "Non-overlapping Intervals",
        "difficulty": "Medium",
        "primary_pattern": "Greedy",
        "hidden_tags": ["Intervals", "Sorting", "Array"]
    },
    {
        "leetcode_id": 560,
        "title": "Subarray Sum Equals K",
        "difficulty": "Medium",
        "primary_pattern": "Prefix Sum",
        "hidden_tags": ["Subarray Sum", "Hashing", "Array"]
    },
    {
        "leetcode_id": 684,
        "title": "Redundant Connection",
        "difficulty": "Medium",
        "primary_pattern": "Union Find",
        "hidden_tags": ["Cycle Detection", "Graphs"]
    },
    {
        "leetcode_id": 739,
        "title": "Daily Temperatures",
        "difficulty": "Medium",
        "primary_pattern": "Monotonic Stack",
        "hidden_tags": ["Next Greater", "Array"]
    }
]

def write_json(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

write_json('c:/Users/nagil/booking-app/DeepFocus/dsa_data/patterns.json', {"patterns": patterns})
write_json('c:/Users/nagil/booking-app/DeepFocus/dsa_data/pattern_priority.json', pattern_priority)
write_json('c:/Users/nagil/booking-app/DeepFocus/dsa_data/pattern_alias_map.json', pattern_alias_map)
write_json('c:/Users/nagil/booking-app/DeepFocus/dsa_data/subpattern_filters.json', subpattern_filters)
write_json('c:/Users/nagil/booking-app/DeepFocus/dsa_data/curated_questions.json', questions)

print("Data successfully generated.")
