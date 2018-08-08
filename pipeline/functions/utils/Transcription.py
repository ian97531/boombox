START_TIME = 'start_time'
END_TIME = 'end_time'
WORD = 'word'
SPEAKER = 'speaker'
CONFIDENCE = 'confidence'

DRIFT = 'drift'
LEFT_OFFSET = 'left_offset'
RIGHT_OFFSET = 'right_offset'

class Transcription():
    startTime = 0

    def __init__(self, transcription, startTime=0):
        self.json = transcription
        self.startTime = startTime
        self.index = 0

        if self.startTime != 0:
            for item in self.json:
                item[START_TIME] = item[START_TIME] + self.startTime
                item[END_TIME] = item[END_TIME] + self.startTime

    def read(self, distance=1):
        items = self.json[self.index : self.index + distance]
        self.index = self.index + distance
        return items

    def peek(self, distance=1):
        items = self.json[self.index : self.index + distance]
        return items

    def reset(self):
        self.index = 0

    def enhanceTranscription(self, transcription):
        output = []
        leftIndex = 0
        rightIndex = 0
        while leftIndex >= len(self.json) or rightIndex >= len(transcription.json):
            left = self.json[leftIndex]
            right = transcription.json[rightIndex]

            if left[WORD].lower() == right[WORD].lower():
                output.append(left)
                leftIndex = leftIndex + 1
                rightIndex = rightIndex + 1
            else:
                result = getBestTimeMatch(self.json, transcription.json, leftIndex, rightIndex, 1, 1)
                
                leftMatch = self.json[leftIndex : leftIndex + result[LEFT_OFFSET]]
                rightMatch = transcription.json[rightIndex : rightIndex + result[RIGHT_OFFSET]]

                leftIndex = leftIndex + result[LEFT_OFFSET]
                rightIndex = rightIndex + result[RIGHT_OFFSET]

                leftConfidence = getConfidence(leftMatch)
                rightConfidence = getConfidence(rightMatch)

                if leftConfidence >= rightConfidence:
                    output = output + leftMatch
                else:
                    leftSpeaker = getSpeaker(leftMatch)
                    if leftSpeaker != None:
                        for item in rightMatch:
                            item[SPEAKER] = leftSpeaker
                    output = output + rightMatch

        while leftIndex < len(self.json):
            output = output + self.json[leftIndex]
            leftIndex = leftIndex + 1

        while rightIndex < len(transcription.json):
            output = output + transcription.json[rightIndex]
            rightIndex = rightIndex + 1

        self.json = output
        self.reset()

    def appendTranscription(self, transcription, withOverlap=10):
        leftStartIndexFound = False
        leftStartIndex = 0
        index = 0

        # Find the spot in this transcription where the other transcription begins.
        while not leftStartIndexFound:
            if index >= len(self.json):
                break
            
            if self.json[index][START_TIME] >= transcription.startTime:
                leftStartIndexFound = True
                leftStartIndex = index

            index = index + 1

        if not leftStartIndexFound:
            raise Exception('Unable to append transcriptions because their timecodes do not overlap.')

        matchFound = False
        rightStartIndex = 0
        leftOffset = 0
        offset = 0
        
        # Search in both transcriptions for a segment of words that within 5 seconds of each other
        # that have the same content in the same order. The length of the overlapping segment is
        # set by the withOverlap arguement. 
        while not matchFound and (leftStartIndex + offset + withOverlap) < len(self.json):
            matchSegmentStartIndex = leftStartIndex + offset
            matchSegmeentEndIndex = matchSegmentStartIndex + withOverlap
            itemsToMatch = self.json[matchSegmentStartIndex : matchSegmeentEndIndex]
            segmentEndTime = self.json[matchSegmeentEndIndex][START_TIME]

            # Skip the first word of the next transcription since it may have been cut off. This
            # sometimes affects the transcription, confidence, or speaker categorization.
            index = 1
            matches = 0
            currentItem = transcription.json[index]
            
            # Iterate through the appending transcript looking for an overlapping segment. Don't overrun
            # the end of the transcript or look further out than 5 seconds from itemsToMatch.
            while not matchFound and index < len(transcription.json) and currentItem[START_TIME] - segmentEndTime < 5:
                currentItem = transcription.json[index]
                if currentItem[WORD].lower() == itemsToMatch[matches][WORD].lower():
                    matches = matches + 1
                else:
                    matches = 0

                if matches == withOverlap:
                    matchFound = True
                    rightStartIndex = (index - matches) + 1
                    leftOffset = offset

                index = index + 1

            offset = offset + 1
        
        if not matchFound:
            raise Exception('Unable to append transcriptions because an overlap of ' + withOverlap + ' words could not be found.')

        # Determine the time code drift between the two transcriptions.
        drift = round(self.json[leftStartIndex + leftOffset][START_TIME] - transcription.json[rightStartIndex][START_TIME], 3)
        
        # Determine if the speaker classifications have been swapped between the two transriptions.
        swapSpeakers = self.json[leftStartIndex + leftOffset][SPEAKER] != transcription.json[rightStartIndex][SPEAKER]

        # Splice the two transcriptions together, save back to this json.
        self.json = self.json[0 : leftStartIndex + leftOffset] + transcription.json[rightStartIndex:]

        # Fix the timecode drift and speaker classifications of the spliced in items.
        for index in range(leftStartIndex + leftOffset, len(self.json)):
            self.json[index][START_TIME] = round(self.json[index][START_TIME] + drift, 3)
            self.json[index][END_TIME] = round(self.json[index][END_TIME] + drift, 3)

            if swapSpeakers:
                if self.json[index][SPEAKER] == 0:
                    self.json[index][SPEAKER] = 1
                else:
                    self.json[index][SPEAKER] = 0

    @staticmethod
    def startTimeKey(a):
        return a.startTime


# Recursively calculates the up to 8 items from the left and right arrays that result in the smallest
# amount of time drift between the two result sets.
def getBestTimeMatch(left, right, leftStart, rightStart, leftOffset, rightOffset):
    if leftStart + leftOffset >= len(left) or rightStart + rightOffset >= len(right):
        return None

    leftItems = left[leftStart : leftStart + leftOffset]
    rightItems = right[rightStart : rightStart + rightOffset]
    currentDrift = calculateDrift(leftItems, rightItems)

    if leftOffset < 8 and rightOffset < 8:
        leftResult = getBestTimeMatch(left, right, leftStart, rightStart, leftOffset + 1, rightOffset)
        rightResult = getBestTimeMatch(left, right, leftStart, rightStart, leftOffset, rightOffset + 1)
        
        if not leftResult and rightResult[DRIFT] < currentDrift:
            return rightResult
        
        if not rightResult and leftResult[DRIFT] < currentDrift:
            return leftResult

        if leftResult and rightResult:
            if leftResult[DRIFT] < rightResult[DRIFT] and leftResult[DRIFT] < currentDrift:
                return leftResult
            elif rightResult[DRIFT] < currentDrift:
                return rightResult
    
    return {
        DRIFT: currentDrift,
        LEFT_OFFSET: leftOffset,
        RIGHT_OFFSET: rightOffset
    }

# Calculates the total drift of the start and end times of the items provided.
def calculateDrift(leftItems, rightItems):
    leftFirst = leftItems[0]
    leftLast = leftItems[len(leftItems) - 1]

    rightFirst = rightItems[0]
    rightLast = rightItems[len(rightItems) - 1]
    
    startDrift = abs(leftFirst[START_TIME] - rightFirst[START_TIME])
    endDrift = abs(leftLast[END_TIME] - rightLast[END_TIME])

    return startDrift + endDrift

# Returns the average confidence value for the items provided.
def getConfidence(items):
    count = 0
    confidence = 0

    for item in items:
        count = count + 1
        confidence = confidence + item[CONFIDENCE]

    return confidence/count

# Returns the value of the speaker if all items have the same speaker value. Otherwise,
# it returns None.
def getSpeaker(items):
    currentSpeaker = None
    failed = False

    for item in items:
        if currentSpeaker == None and failed == False:
            currentSpeaker = item[SPEAKER]
        elif failed == False and currentSpeaker != item[SPEAKER]:
            currentSpeaker = None
            failed = True
    
    return currentSpeaker
