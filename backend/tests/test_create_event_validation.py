# Create event input validation
def user_create_validation (uID, eventT, eventD, dateStart, dateEnd, month, location, tStart, tEnd, state, city):
    #uID = input("User ID")
    #eventT = input("Event Title")
    #eventD = input("Event Desc")
    #dateStart = input("Start day")
    #dateEnd = input("End day")
    #month = input("Month")

    assert uID
    assert month.isnumeric()
    assert dateStart.isnumeric()
    assert dateEnd.isnumeric():
    assert int(month) < 12 and int(month) > 1
    assert int(dateEnd) >= int(dateStart)
    
    if int(month) == 1 or int(month) == 3 or int(month) == 5 or int(month) == 7 or int(month) == 8 or int(month) == 10 or int(month) == 12:
        assert int(dateStart) > 0 and int(dateStart) < 32 and int(dateEnd) < 32 and int(dateEnd) > 0

        
    if int(month) == 2:
        assert int(dateStart) > 0 and int(dateStart) < 29 and int(dateEnd) < 29 and int(dateEnd) > 0
        
    if int(month) == 4 or int(month) == 6 or int(month) == 9 or int(month) == 11:
        assert int(dateStart) > 0 and int(dateStart) < 31 and int(dateEnd) < 31 and int(dateEnd) > 0


    assert tStart > -1 and tStart < 2401
    assert int((int(tStart) % 100) / 60) == 0
    
    assert tEnd > -1 and tEnd < 2401
    assert int((int(tEnd) % 100) / 60) == 0
    
    if dateStart == dateEnd:
        assert tStart < tEnd

    assert eventT
    assert eventD
    assert location
    assert state
    assert city
    
