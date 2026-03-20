import random
from datetime import date

theQuiz=[
    [{'question':'What is your favorite color?','itemNum':'22','pts':56},
    {'question':'When is your birthday?','itemNum':'11','pts':12},
     {'question':'Who is your favorite person?','itemNum':'6','pts':33},
     {'question':'Where do you live?','itemNum':'4','pts':1}
     ],
    [{'subject':'Math101','units':'6','yrLevel':2},
     {'subject':'Psy102','units':'5','yrLevel':4},
     {'subject':'PE11','units':'4','yrLevel':1},
     {'subject':'Prog1','units':'7','yrLevel':3}]
]

questions = theQuiz[0]
subjects = theQuiz[1]

def findQuestion(keyword):
    for q in questions:
        if keyword.lower() in q['question'].lower():
            return q

def findSubject(name):
    for s in subjects:
        if s['subject'] == name:
            return s

pe11 = findSubject('PE11')
where = findQuestion('Where do you live')
print(f"{pe11['subject']} for {pe11['units']} units, {where['question']} for {where['pts']} pts")

prog1 = findSubject('Prog1')
who = findQuestion('Who is your favorite person')
print(f"{prog1['subject']} for {prog1['units']} units, this is {who['pts']} pts, {who['question']}")

color = findQuestion('What is your favorite color')
psy102 = findSubject('Psy102')
print(f"{color['itemNum']}. {color['question']} for {psy102['units']} units in {psy102['subject']}")

bday = findQuestion('When is your birthday')
math101 = findSubject('Math101')
fav = findQuestion('What is your favorite color')
print(f"{bday['question']} this is {bday['itemNum']} yearLevel of {math101['yrLevel']}  for {fav['pts']} pts.")


def luckyNumber():
    num = random.randint(1, 100)
    return num

def averageOfSix(a, b, c, d, e, f):
    sum = a + b + c + d + e + f
    avg = sum / 6
    return avg

def greetUser(firstname, middlename, lastname, birthYear):
    age = date.today().year - birthYear
    print(f"Hello {firstname} {middlename} {lastname}! are you {str(age)} years old?")

print("Lucky Number:", luckyNumber())
print("Average:", averageOfSix(50, 51, 52, 53, 67, 69))
greetUser("Karlo", "Emil", "Flores", 1989)
print("INF231_INTRPYTH_LIM_ANAMARIE_jpyStt2jgmlP231")