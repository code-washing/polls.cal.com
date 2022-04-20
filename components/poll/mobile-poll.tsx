import { Listbox } from "@headlessui/react";
import { Participant, Vote } from "@prisma/client";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "next-i18next";
import * as React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import smoothscroll from "smoothscroll-polyfill";

import ChevronDown from "@/components/icons/chevron-down.svg";
import Pencil from "@/components/icons/pencil.svg";
import PlusCircle from "@/components/icons/plus-circle.svg";
import Save from "@/components/icons/save.svg";
import Trash from "@/components/icons/trash.svg";
import { usePoll } from "@/components/poll-context";

import { requiredString } from "../../utils/form-validation";
import Button from "../button";
import { styleMenuItem } from "../menu-styles";
import NameInput from "../name-input";
import TimeZonePicker from "../time-zone-picker";
import { useUserName } from "../user-name-context";
import PollOptions from "./mobile-poll/poll-options";
import TimeSlotOptions from "./mobile-poll/time-slot-options";
import {
  useAddParticipantMutation,
  useUpdateParticipantMutation,
} from "./mutations";
import { ParticipantForm, PollProps } from "./types";
import { useDeleteParticipantModal } from "./use-delete-participant-modal";
import UserAvater from "./user-avatar";

if (typeof window !== "undefined") {
  smoothscroll.polyfill();
}

const MobilePoll: React.VoidFunctionComponent<PollProps> = ({ pollId }) => {
  const pollContext = usePoll();

  const { poll, targetTimeZone, setTargetTimeZone } = pollContext;

  const { timeZone, participants, role } = poll;

  const [, setUserName] = useUserName();

  const participantById = participants.reduce<
    Record<string, Participant & { votes: Vote[] }>
  >((acc, curr) => {
    acc[curr.id] = { ...curr };
    return acc;
  }, {});

  const form = useForm<ParticipantForm>({
    defaultValues: {
      name: "",
      votes: [],
    },
  });

  const { reset, handleSubmit, control, formState } = form;
  const [selectedParticipantId, setSelectedParticipantId] =
    React.useState<string>();

  const selectedParticipant = selectedParticipantId
    ? participantById[selectedParticipantId]
    : undefined;

  const [editable, setEditable] = React.useState(() =>
    participants.length > 0 ? false : true,
  );

  const [shouldShowSaveButton, setShouldShowSaveButton] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const setState = () => {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect();
        const saveButtonIsVisible = rect.bottom <= window.innerHeight;

        setShouldShowSaveButton(
          !saveButtonIsVisible &&
            formRef.current.getBoundingClientRect().top <
              window.innerHeight / 2,
        );
      }
    };
    setState();
    window.addEventListener("scroll", setState, true);
    return () => {
      window.removeEventListener("scroll", setState, true);
    };
  }, []);

  const { t } = useTranslation("app");

  const { mutate: updateParticipantMutation } =
    useUpdateParticipantMutation(pollId);

  const { mutate: addParticipantMutation } = useAddParticipantMutation(pollId);
  const confirmDeleteParticipant = useDeleteParticipantModal();

  const submitContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollToSave = () => {
    if (submitContainerRef.current) {
      window.scrollTo({
        top:
          document.documentElement.scrollTop +
          submitContainerRef.current.getBoundingClientRect().bottom -
          window.innerHeight +
          100,
        behavior: "smooth",
      });
    }
  };
  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        className="border-t border-b bg-white shadow-sm"
        onSubmit={handleSubmit((data) => {
          return new Promise<ParticipantForm>((resolve, reject) => {
            if (selectedParticipant) {
              updateParticipantMutation(
                {
                  participantId: selectedParticipant.id,
                  pollId,
                  ...data,
                },
                {
                  onSuccess: () => {
                    resolve(data);
                    setEditable(false);
                  },
                  onError: reject,
                },
              );
            } else {
              addParticipantMutation(data, {
                onSuccess: (newParticipant) => {
                  setSelectedParticipantId(newParticipant.id);
                  resolve(data);
                  setEditable(false);
                },
                onError: reject,
              });
            }
          });
        })}
      >
        <div className="sticky top-0 z-30 flex flex-col space-y-2 border-b bg-gray-50 p-3">
          <div className="flex space-x-3">
            <Listbox
              value={selectedParticipantId}
              onChange={setSelectedParticipantId}
              disabled={editable}
            >
              <div className="menu grow">
                <Listbox.Button
                  className={clsx("btn-default w-full px-2 text-left", {
                    "btn-disabled": editable,
                  })}
                >
                  <div className="grow">
                    {selectedParticipant ? (
                      <div className="flex items-center space-x-2">
                        <UserAvater name={selectedParticipant.name} />
                        <span>{selectedParticipant.name}</span>
                      </div>
                    ) : (
                      t("participantCount", { count: participants.length })
                    )}
                  </div>
                  <ChevronDown className="h-5" />
                </Listbox.Button>
                <Listbox.Options
                  as={motion.div}
                  transition={{
                    duration: 0.1,
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="menu-items max-h-72 w-full overflow-auto"
                >
                  <Listbox.Option value={undefined} className={styleMenuItem}>
                    {t("participantCount", { count: participants.length })}
                  </Listbox.Option>
                  {participants.map((participant) => (
                    <Listbox.Option
                      key={participant.id}
                      value={participant.id}
                      className={styleMenuItem}
                    >
                      <div className="flex items-center space-x-2">
                        <UserAvater name={participant.name} />
                        <span>{participant.name}</span>
                      </div>
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
            {!poll.closed && !editable ? (
              selectedParticipant ? (
                <div className="flex space-x-3">
                  <Button
                    icon={<Pencil />}
                    onClick={() => {
                      setEditable(true);
                      reset({
                        name: selectedParticipant.name,
                        votes: selectedParticipant.votes.map(
                          (vote) => vote.optionId,
                        ),
                      });
                    }}
                  >
                    Edit
                  </Button>
                  {role === "admin" ? (
                    <Button
                      icon={<Trash />}
                      data-testid="delete-participant-button"
                      type="danger"
                      onClick={() => {
                        if (selectedParticipant) {
                          confirmDeleteParticipant(selectedParticipant.id);
                        }
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusCircle />}
                  onClick={() => {
                    reset({ name: "", votes: [] });
                    setUserName("");
                    setEditable(true);
                  }}
                >
                  New
                </Button>
              )
            ) : null}
            {editable ? (
              <Button
                onClick={() => {
                  setEditable(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
          {timeZone ? (
            <TimeZonePicker
              value={targetTimeZone}
              onChange={setTargetTimeZone}
            />
          ) : null}
        </div>
        {(() => {
          switch (pollContext.pollType) {
            case "date":
              return (
                <PollOptions
                  selectedParticipantId={selectedParticipantId}
                  options={pollContext.options}
                  editable={editable}
                />
              );
            case "timeSlot":
              return (
                <TimeSlotOptions
                  selectedParticipantId={selectedParticipantId}
                  options={pollContext.options}
                  editable={editable}
                />
              );
          }
        })()}
        <AnimatePresence>
          {shouldShowSaveButton && editable ? (
            <motion.button
              type="button"
              variants={{
                exit: {
                  opacity: 0,
                  y: -50,
                  transition: { duration: 0.2 },
                },
                hidden: { opacity: 0, y: 50 },
                visible: { opacity: 1, y: 0, transition: { delay: 0.2 } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed bottom-8 left-1/2 z-10 -ml-6 inline-flex h-12 w-12 appearance-none items-center justify-center rounded-full bg-white text-slate-700 shadow-lg active:bg-gray-100"
            >
              <Save className="w-5" onClick={scrollToSave} />
            </motion.button>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {editable ? (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: -100, height: 0 },
                visible: { opacity: 1, y: 0, height: "auto" },
              }}
              initial="hidden"
              animate="visible"
              exit={{
                opacity: 0,
                y: -10,
                height: 0,
                transition: { duration: 0.2 },
              }}
            >
              <div
                ref={submitContainerRef}
                className="space-y-3 border-t bg-gray-50 p-3"
              >
                <div className="flex space-x-3">
                  <Controller
                    name="name"
                    control={control}
                    rules={{ validate: requiredString }}
                    render={({ field }) => (
                      <NameInput
                        disabled={formState.isSubmitting}
                        className={clsx("input w-full", {
                          "input-error": formState.errors.name,
                        })}
                        {...field}
                      />
                    )}
                  />
                  <Button
                    className="grow"
                    icon={<Save />}
                    htmlType="submit"
                    type="primary"
                    loading={formState.isSubmitting}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </form>
    </FormProvider>
  );
};

export default MobilePoll;
