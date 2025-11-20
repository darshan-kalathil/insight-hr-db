import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

interface AbsenceTypeSelectProps {
  leaveTypes: string[];
  regularizationTypes: string[];
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
}

export const AbsenceTypeSelect = ({
  leaveTypes,
  regularizationTypes,
  selectedTypes,
  onSelectedTypesChange,
}: AbsenceTypeSelectProps) => {
  const [open, setOpen] = useState(false);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onSelectedTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onSelectedTypesChange([...selectedTypes, type]);
    }
  };

  const selectAllLeaves = () => {
    if (areAllLeavesSelected) {
      // Deselect all leaves
      onSelectedTypesChange(selectedTypes.filter(t => !leaveTypes.includes(t)));
    } else {
      // Select all leaves
      const allLeaves = [...new Set([...selectedTypes, ...leaveTypes])];
      onSelectedTypesChange(allLeaves);
    }
  };

  const selectAllRegularizations = () => {
    if (areAllRegularizationsSelected) {
      // Deselect all regularizations
      onSelectedTypesChange(selectedTypes.filter(t => !regularizationTypes.includes(t)));
    } else {
      // Select all regularizations
      const allRegularizations = [...new Set([...selectedTypes, ...regularizationTypes])];
      onSelectedTypesChange(allRegularizations);
    }
  };

  const areAllLeavesSelected = leaveTypes.every(type => selectedTypes.includes(type));
  const areAllRegularizationsSelected = regularizationTypes.every(type => selectedTypes.includes(type));

  const displayText = selectedTypes.length === 0
    ? 'Select absence types'
    : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          {displayText}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>No absence types found.</CommandEmpty>
            
            {leaveTypes.length > 0 && (
              <CommandGroup heading="Leaves">
                <CommandItem
                  onSelect={selectAllLeaves}
                  className="cursor-pointer font-semibold border-b border-border mb-1"
                >
                  <Checkbox
                    checked={areAllLeavesSelected}
                    className="mr-2"
                  />
                  <span>Select All Leaves</span>
                </CommandItem>
                {leaveTypes.map((type) => (
                  <CommandItem
                    key={type}
                    onSelect={() => toggleType(type)}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      className="mr-2"
                    />
                    <span>{type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {regularizationTypes.length > 0 && (
              <CommandGroup heading="Regularizations">
                <CommandItem
                  onSelect={selectAllRegularizations}
                  className="cursor-pointer font-semibold border-b border-border mb-1"
                >
                  <Checkbox
                    checked={areAllRegularizationsSelected}
                    className="mr-2"
                  />
                  <span>Select All Regularizations</span>
                </CommandItem>
                {regularizationTypes.map((type) => (
                  <CommandItem
                    key={type}
                    onSelect={() => toggleType(type)}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      className="mr-2"
                    />
                    <span>{type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
