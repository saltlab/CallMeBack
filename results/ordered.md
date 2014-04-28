ITEM CREATION SCENARIO
------------------------

[v clock:browser tick:34] 596 undefined:function
[v clock:browser tick:35] 604 Todos.create:callsite
[v clock:browser tick:36] 605 create:function
[v clock:browser tick:37] 607 $http.post:callsite
[v clock:browser tick:38] 612 Todos.create($scope.formData).success:callsite
[v clock:server tick:57] 637 ('post' callback):function
[v clock:server tick:58] 638 Todo.create:callsite
[v clock:server tick:59] 639 ('create' callback):function
[v clock:server tick:60] 640 Todo.find:callsite
[v clock:server tick:61] 640 ('find' callback):function
[v clock:server tick:62] 640 res.json:callsite
[v clock:browser tick:39] 673 ('success' callback):function


ITEM DELETION SCENARIO
------------------------

[v clock:browser tick:40] 437 undefined:function
[v clock:browser tick:41] 447 Todos.delete:callsite
[v clock:browser tick:42] 449 delete:function
[v clock:browser tick:43] 450 $http.delete:callsite
[v clock:browser tick:44] 456 Todos.delete(id).success:callsite
[v clock:server tick:63] 480 ('delete' callback):function
[v clock:server tick:64] 481 Todo.remove:callsite
[v clock:server tick:65] 481 ('remove' callback):function
[v clock:server tick:66] 481 Todo.find:callsite
[v clock:server tick:67] 483 ('find' callback):function
[v clock:server tick:68] 483 res.json:callsite
[v clock:browser tick:45] 531 ('success' callback):function