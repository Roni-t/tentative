import sys
def test_user_delete_event (uID, eventID)
    #Backend would pull eventUID from the database using eventID, but we don't have a database
    #uID = input("User ID ")
    #eventUID = input("Event creator's ID ")

    if not uID or not eventUID:
        sys.exit("There's been a problem; try again later.")

    if uID != eventUID:
        sys.exit("You do not have permission for that.")
    
    yn = input("Are you sure? Y/N ")

    while yn != "Y" and yn != "N":
        yn = input("Are you sure? Y/N ")
    
    if yn == "Y":
        #call delete from database
        return "Deleted."
        #print("Delete")

    if yn == "N":
        sys.exit("Returning to Previous screen.")
