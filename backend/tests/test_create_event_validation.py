
# Create event input validation
import sys
def test_create_event_validation (uID, eventT, eventD, dateStart, dateEnd, month):
    #testing input will come from the console because we don't have a database yet
    #uID = input("User ID")
    #eventT = input("Event Title")
    #eventD = input("Event Desc")
    #dateStart = input("Start day")
    #dateEnd = input("End day")
    #month = input("Month")

    if not uID:
        return "Sign in first.\n"
        #sys.exit("Sign in first.\n")

    if not month.isnumeric() or not dateStart.isnumeric() or not dateEnd.isnumeric():
        return "Improper date.\n"
        #sys.exit("Improper date.\n")

    if int(month) > 12 or int(month) < 1:
        return "That is not a month.\n"
        #sys.exit("That is not a month.\n")
    
    if int(dateEnd) < int(dateStart):
        return "Improper length of time.\n"
        #sys.exit("Improper length of time.\n")
    
    if int(month) == 1 or int(month) == 3 or int(month) == 5 or int(month) == 7 or int(month) == 8 or int(month) == 10 or int(month) == 12:
        if int(dateStart) < 1 or int(dateStart) > 31 or int(dateEnd) > 31 or int(dateEnd) < 1:
            return "Invalid date.\n"
            #sys.exit("Invalid date.\n")
        
    if int(month) == 2:
        if int(dateStart) < 1 or int(dateStart) > 28 or int(dateEnd) > 28 or int(dateEnd) < 1:
            return "Invalid date.\n"
            #sys.exit("Invalid date.\n")
        
    if int(month) == 4 or int(month) == 6 or int(month) == 9 or int(month) == 11:
        if int(dateStart) < 1 or int(dateStart) > 30 or int(dateEnd) > 30 or int(dateEnd) < 1:
            return "Invalid date.\n"
            #sys.exit("Invalid date.\n")
        
    if not eventT or not eventD:
        return "Neither title nor description can be empty.\n"
        #sys.exit("Neither title nor description can be empty.\n")    
    
    #Call create event
    print("Success")
    return "Success.\n"
